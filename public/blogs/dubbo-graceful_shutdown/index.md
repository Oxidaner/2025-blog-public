# dubbo-go 优雅下线：一次 Provider 下线时，流量到底是怎么被摘掉的？

> 这篇文章讲的是 **dubbo-go 的优雅下线**。  
> 重点不是把源码逐行翻译一遍，而是讲清楚：**一次 Provider 下线时，Consumer 为什么还能及时避开它，旧注册数据为什么不会把它重新加回来，在途请求又是怎么被尽量处理完的。**

很多人一提到优雅下线，第一反应是：

> 收到 SIGTERM 之后 sleep 几秒，然后退出。

但 dubbo-go 这里真正做的事情不是 sleep，而是一个分阶段的 **摘流量过程**。

服务端不能一收到停机信号就直接死掉。因为在分布式 RPC 系统里，请求路径不是：

```text
Consumer 每次调用 -> 实时问注册中心 -> 找 Provider
```

更常见的路径是：

```text
Consumer 本地维护一份 Directory
每次调用从 Directory 里选一个 invoker
然后请求打到对应 Provider
```

所以，下线的关键不只是：

> Provider 有没有从注册中心删掉？

更关键的是：

> Consumer 本地 Directory 里的这个 Provider invoker 有没有被及时摘掉？

这就是 dubbo-go 优雅下线里最值得看的地方。

![一次 Provider 优雅下线的完整摘流量链路](/blogs/dubbo-graceful_shutdown/f9371bad2844fd66.png)

一句话概括这套机制：

> Provider 不是马上死，而是先告诉大家“别再调我”，等流量尽量挪走之后，再拒绝新请求、等待在途请求排空，最后销毁协议和资源。

---

## 1. 先把几个角色摆清楚

这套链路里有四个核心角色。

![四个核心角色](/blogs/dubbo-graceful_shutdown/27ecfdae2e75b991.png)

| 角色      | 作用                                                        |
| --------- | ----------------------------------------------------------- |
| Provider  | 准备下线的服务端实例                                        |
| Consumer  | 调用 Provider 的客户端                                      |
| Registry  | 注册中心，负责服务发现与实例变更推送                        |
| Directory | Consumer 本地的可调用实例列表，负载均衡通常从这里选 invoker |

这里最容易忽略的是 **Directory**。

注册中心只是服务发现的源头，但 Consumer 真正发请求时，多数情况下并不会每次都去注册中心查一次。它会在本地维护一份 invoker 列表，然后负载均衡在这份列表里选目标。

因此，如果 Provider 已经开始下线，但 Consumer 本地 Directory 还没删掉它，就可能出现这种情况：

```text
Provider 已经准备退出
注册中心变更还没推到 Consumer
Consumer 本地还保留旧 invoker
负载均衡继续选中它
请求又打到了正在下线的 Provider
```

所以，dubbo-go 的优雅下线，本质上是在解决一个问题：

> 怎么让 Consumer 尽快把这个即将下线的 Provider 从本地 Directory 里摘掉？

---

## 2. Provider 侧：不是直接退出，而是先进入 closing

Provider 收到停机信号后，会进入一条类似 `beforeShutdown()` 的主流程。

它不是直接销毁协议，而是先进入 closing 状态，再逐步做反注册、通知、等待和销毁。

![Provider 侧状态变化](/blogs/dubbo-graceful_shutdown/0219ca3ea7b492d5.png)

可以把 Provider 的下线过程理解成三个阶段。

| 阶段       | 状态                                       | 目的                                                |
| ---------- | ------------------------------------------ | --------------------------------------------------- |
| 软下线阶段 | `Closing = true`                           | 服务还活着，但开始告诉框架和 Consumer：我准备下线了 |
| 摘流量阶段 | 反注册、主动通知、响应带 `closing=true`    | 尽量让 Consumer 不再选择这个实例                    |
| 硬退出阶段 | `RejectRequest = true`、等待排空、销毁协议 | 拒绝新请求，处理完存量请求后释放资源                |

### 2.1 `Closing = true`：这是“下线预告”，不是“服务已死”

Provider 下线的第一步，不是关闭端口，也不是销毁连接，而是把内部状态标记为 closing。

这个状态的含义是：

> 我还可以处理已经打过来的请求，但我已经不应该再接新流量了。

后面很多动作都依赖这个状态：

- Provider 返回响应时，可以在 attachment 里带上 `closing=true`；
- gRPC / Triple 可以把 health 状态切到 `NOT_SERVING`；
- Consumer 收到 closing 信号后，会把对应 invoker 从本地 Directory 摘掉；
- Provider 后续会进入更强硬的 `RejectRequest = true` 阶段。

所以 `Closing = true` 更像是一个 **下线预告**。

它不是说：

> 我已经不能工作了。

而是说：

> 我还在，但你们应该开始把流量迁走了。

---

## 3. 为什么反注册和销毁协议必须分开？

优雅下线里有一个非常关键的顺序：

> 先从注册中心反注册，但不要马上销毁协议。

因为注册中心通知 Consumer 是异步的。Provider 从注册中心删掉自己，只代表注册中心知道它要下线了，不代表所有 Consumer 的本地 Directory 都已经同步更新。

如果一反注册就立刻关闭 server，就会出现很典型的竞态问题。

![反注册和销毁协议必须分开](/blogs/dubbo-graceful_shutdown/1abd173b7917af2c.png)

正确顺序应该是：

```text
先从注册中心摘掉自己
服务继续存活一小段时间
通过主动通知和被动通知让 Consumer 感知 closing
Consumer 本地摘掉 invoker
Provider 拒绝新请求并等待存量请求排空
最后再销毁协议和连接
```

这也是为什么优雅下线不能只看 Provider 侧有没有执行 `unregister`。

反注册只是第一步。真正决定流量有没有摘干净的是：

> Consumer 本地还会不会选中这个 Provider。

---

## 4. 主动通知：gRPC / Triple 通过 Health.Watch 提前告诉 Consumer

只依赖注册中心有延迟，所以 dubbo-go 又加了一条主动通知路径。

Provider 下线时，主流程会调用协议层注册的 graceful shutdown callback。对于 gRPC 和 Triple 来说，核心动作是：

```text
把服务健康状态从 SERVING 改成 NOT_SERVING
```

这个动作不是断开连接，而是通过健康检查通道提前通知 Consumer：

> 我快下线了，别再选我。

![主动通知链路](/blogs/dubbo-graceful_shutdown/29143ef633bee41f.png)

这条链路的价值在于：

> Consumer 不必傻等注册中心变更推送，而是可以通过长连接上的 health watch 第一时间知道 Provider 正在下线。

### 4.1 gRPC 链路可以这样理解

Provider 正常 export 服务时，会把健康状态设为 `SERVING`。

Consumer 创建 gRPC invoker 时，会启动 health watch，持续监听服务状态。

Provider 下线时，gRPC 的 shutdown callback 会把服务状态切成 `NOT_SERVING`。Consumer 的 watch 收到这个状态后，就会生成 `ClosingEvent`，最后把本地 Directory 里的对应 invoker 删除。

这个链路可以简化成：

```text
Provider 下线
-> gRPC callback 执行
-> SetAllServicesNotServing()
-> Consumer Health.Watch 收到 NOT_SERVING
-> 生成 ClosingEvent
-> Directory 删除 invoker
```

### 4.2 Triple 链路和 gRPC 很像，但要注意 healthClient

Triple 的核心逻辑和 gRPC 类似。

Provider export 时，会把 serviceKey 标记成 `SERVING`。Consumer refer 时，会创建 `TripleInvoker`，并启动后台 `Health.Watch`。

Provider 下线时，Triple 的 callback 会把 serviceKey 的状态改成 `NOT_SERVING`。Consumer 收到之后，同样生成 `ClosingEvent`，再交给统一处理器删除本地实例。

Triple 这里有一个小细节：它会单独创建一个 `healthClient`。

为什么不是直接用业务 client？

因为业务 client 是调业务接口的，而 health watch 调的是标准健康检查服务：

```text
grpc.health.v1.Health/Watch
```

所以可以把它理解成两条逻辑通道。

![业务 client 和 health client](/blogs/dubbo-graceful_shutdown/95b3b4cd9749ba08.png)

- **业务 client**：负责正常 RPC 请求；
- **health client**：负责监听 Provider 的健康状态变化；
- **Provider 下线时**：health 通道先感知 `NOT_SERVING`，Consumer 本地先摘除实例，业务请求就不会继续选它。

这就是主动通知的核心收益：

> 下线信号沿着已有长连接提前到达 Consumer，Consumer 能比注册中心推送更快地避开这个 Provider。

---

## 5. 被动通知：响应里带 `closing=true`

主动通知很好，但它不是万能的。

有些 Consumer 可能没开 health watch，有些协议可能没有这个能力，也可能恰好还有请求在注册中心推送收敛前打到了 closing Provider。

这时 Provider 也不会马上粗暴拒绝请求。它可以正常处理这次请求，然后在响应里带一个标记：

```text
closing = true
```

这就是被动通知链路。

![被动通知链路](/blogs/dubbo-graceful_shutdown/2be32e2d8afdcc09.png)

Provider filter 的逻辑可以这样理解：

```text
请求进来：
  ProviderActiveCount +1
  记录 ProviderLastReceivedRequestTime

请求返回：
  ProviderActiveCount -1
  如果 Closing = true，就在响应 attachment 里加 closing=true
```

这个设计很实用。

它表达的是：

> 这次请求我给你处理完，但我已经在下线了，下次不要再选我。

它不是主动推送，而是 Consumer 在一次正常响应里顺手拿到了下线信号。

这条路径补的是主动通知的盲区：

- health watch 没开；
- 协议不支持主动通知；
- 注册中心通知还没到；
- Consumer 本地 Directory 还没刷新；
- 请求已经打到 closing Provider。

只要这次请求还能正常返回，Consumer 就能从响应里看到 `closing=true`，然后本地摘掉这个 invoker。

---

## 6. Consumer 侧：收到 closing 后，真正要做的是“不再选它”

Consumer 感知到 Provider closing 以后，不能只是打一行日志。

真正有意义的动作是：

> 后续负载均衡不要再选这个 Provider。

Consumer 现在主要有三类 closing 感知方式。

![Consumer closing 信号收敛](/blogs/dubbo-graceful_shutdown/1a9425789465e4c8.png)

### 6.1 第一类：Health.Watch 收到 `NOT_SERVING`

这是主动通知路径。

Provider 下线时，gRPC / Triple 的健康状态从 `SERVING` 切到 `NOT_SERVING`。Consumer 的 watch 收到后，会生成关闭事件。

这条路径速度快，适合长连接 Consumer。

### 6.2 第二类：响应 attachment 里有 `closing=true`

这是被动通知路径。

Consumer 原本还选中了这个 Provider，但请求返回时发现响应里带了 `closing=true`，说明 Provider 已经进入下线流程。

Consumer 后续就应该把这个 invoker 从本地列表里摘掉。

### 6.3 第三类：调用失败，错误像是连接正在关闭

这是兜底路径。

有时候 Consumer 拿不到正常响应，只看到连接关闭类错误，比如：

```text
transport is closing
client connection is closing
gRPC Unavailable
gRPC Canceled
client closed
invoker destroyed
```

这类错误不一定百分百代表优雅下线，但在这个场景下非常可疑。

如果 Consumer 识别到这类错误，就会认为这个 Provider 很可能已经在关闭，于是执行类似：

```text
markClosingInvoker()
handleClosingEvent()
```

也就是先把 invoker 标记成 closing / unavailable，再生成统一的关闭事件。

这条路径解决的是：

> 响应没回来，但错误已经能说明这个实例不可靠了。

---

## 7. ClosingEvent：把各种关闭信号统一起来

closing 信号来源很多：

- gRPC health watch；
- Triple health watch；
- response attachment；
- connection closing error。

如果每种来源都自己写一套删除 Directory 的逻辑，代码会变得非常散。

所以 dubbo-go 把它们统一成 `ClosingEvent`。

一个关闭事件至少要表达这些信息：

| 字段        | 含义                                                      |
| ----------- | --------------------------------------------------------- |
| Source      | 信号来源，比如 health watch、attachment、connection error |
| ServiceKey  | 哪个服务                                                  |
| InstanceKey | 哪个具体实例                                              |
| Address     | 实例地址                                                  |

统一成事件之后，后面的处理逻辑就清楚了：

```text
不同来源的 closing 信号
-> 统一生成 ClosingEvent
-> ClosingEventHandler 找到对应 Directory
-> Directory.RemoveClosingInstance(instanceKey)
```

也就是说，ClosingEvent 是这套设计的中枢。

它把“我在哪里感知到 Provider 要下线”这件事，和“我怎么从本地列表删除 Provider”这件事解耦了。

---

## 8. Directory：真正把实例从本地列表删掉

Consumer 本地 Directory 维护的是当前可调用的 invoker 列表。

当 `ClosingEventHandler` 调用：

```text
RemoveClosingInstance(instanceKey)
```

RegistryDirectory 并不是简单地从 map 里删一下就完事。它需要处理并发、缓存、可路由列表重建、资源释放，以及后面要讲的 tombstone。

![Directory 删除实例的内部步骤](/blogs/dubbo-graceful_shutdown/af1e363748caac29.png)

这一步完成后，负载均衡就不会再选到这个 Provider 了。

这也是 dubbo-go 这套方案的关键变化：

> Consumer 已经知道 Provider 要下线时，可以直接在本地摘掉它，不用一直等注册中心通知收敛。

从系统效果上看，这一步缩短了流量迁移时间。

从故障表现上看，它减少了“Provider 已经下线，但 Consumer 还在继续打它”的窗口。

---

## 9. tombstone：防止旧注册数据把实例“复活”

本地快速摘除还有一个副作用：

> 如果注册中心旧数据晚到，会不会把刚删掉的实例又加回来？

这在分布式系统里很常见。

时间线可能是这样的：

```text
T1 Consumer 通过 Health.Watch 收到 NOT_SERVING
T2 Directory 删除实例 A
T3 注册中心某个旧的 add/update 事件晚到，里面还包含实例 A
T4 Directory 又把实例 A 构建回来了
T5 请求再次打到正在下线的 Provider A
```

这就是“旧数据晚到导致实例复活”。

为了解决这个问题，Directory 删除 closing 实例时，会写一条 tombstone。

你可以把 tombstone 理解成短期黑名单：

> 这个实例刚刚因为 closing 被删除，在一段时间内不要重新构建它。

![tombstone 防止旧注册数据复活实例](/blogs/dubbo-graceful_shutdown/d850f03085bbfb05.png)

后续如果注册中心事件想重建同一个 `instanceKey`，Directory 会先检查 tombstone：

```text
tombstone 还没过期 -> 跳过重建
tombstone 已过期 -> 允许正常重建
```

这个设计解决的是一个很现实的问题：

> 本地摘除速度很快，但注册中心推送不一定有序、不一定及时。没有 tombstone，本地快速摘除可能会被旧事件覆盖。

所以 tombstone 的价值不是“删除实例”，而是：

> 保证删除动作在短时间内不会被旧数据撤销。

---

## 10. 请求排空：不能只看 activeCount

流量摘掉之后，Provider 还要等待请求排空。

这里有两个常见计数：

```text
ProviderActiveCount：别人打进当前 Provider 的请求
ConsumerActiveCount：当前进程自己作为 Consumer 发出去的请求
```

很多人会觉得，只要 `ProviderActiveCount == 0`，就可以退出了。

但实际没这么简单。

因为某一瞬间 active count 为 0，并不代表流量真的停了。可能只是刚好这一毫秒没有请求，下一毫秒又有新请求进来。

所以 dubbo-go 还会结合最近一次收到请求的时间来判断。

![请求排空判断](/blogs/dubbo-graceful_shutdown/f08345e41748c9fd.png)

更稳妥的判断应该是：

```text
ProviderActiveCount == 0
并且最近一个 offlineRequestWindowTimeout 窗口内没有新请求进来
```

也就是说，系统不只问：

> 现在有没有请求？

还会问：

> 最近一小段时间内是不是都没有新请求？

这可以避免一种误判：

```text
activeCount 瞬间变成 0
Provider 以为请求排空了
立刻销毁协议
但实际上 Consumer 还没完全摘掉流量
新请求又来了
```

当等待窗口结束后，Provider 会进入更强硬的阶段：

```text
RejectRequest = true
```

这时新请求会被拒绝，框架继续等待已经进入处理流程的请求结束，直到完成或者超时。

这里体现的是优雅下线的边界：

> 优雅下线会尽力处理存量请求，但不能无限等。超过总超时，最终还是要退出。

---

## 11. 用一条 Triple 链路把整套机制串起来

下面用一次 Triple Provider 下线，把前面的所有点串成一条真实链路。

![Triple Provider 下线端到端时序](/blogs/dubbo-graceful_shutdown/21206ee140270e72.png)

可以拆成十步：

1. Triple Provider 正常启动，export 服务，health 状态为 `SERVING`；
2. Triple Consumer 引用服务，创建 `TripleInvoker`；
3. Consumer 侧启动后台 `Health.Watch`，用 `healthClient` 监听健康状态；
4. Provider 收到 SIGTERM，进入 `Closing = true`，并从注册中心反注册；
5. Triple shutdown callback 执行，把 serviceKey 的健康状态改成 `NOT_SERVING`；
6. Consumer 的 `Health.Watch` 收到 `NOT_SERVING`；
7. Consumer 生成 `ClosingEvent`；
8. `ClosingEventHandler` 找到对应 Directory，按 instanceKey 删除 invoker，并写 tombstone；
9. 如果注册中心旧数据晚到，Directory 命中 tombstone，跳过重建；
10. Provider 等待请求排空，开始拒绝新请求，最后销毁协议和资源。

这条链路里最关键的一步不是 Provider 反注册，也不是 Provider 最后 destroy。

最关键的是：

> Consumer 在本地把这个 invoker 摘掉了。

因为只要 Consumer 本地不再选它，新流量就不会继续打到这个正在下线的 Provider。

---

## 12. 这套设计到底解决了哪些问题？

dubbo-go 的优雅下线不是只解决一个“退出慢一点”的问题，而是在处理一组分布式系统里的竞态。

![问题与解决方案](/blogs/dubbo-graceful_shutdown/9b2450d6d9191fd3.png)

### 12.1 注册中心通知慢

解决方式不是只靠注册中心，而是三条路径一起兜底：

```text
注册中心反注册
+ Health.Watch 主动通知
+ response attachment 被动通知
```

注册中心负责全局服务发现，Health.Watch 负责长连接快速感知，attachment 负责请求级兜底。

### 12.2 Consumer 本地缓存更新慢

解决方式是本地快速摘除：

```text
ClosingEvent -> RemoveClosingInstance
```

Consumer 不必等注册中心刷新 Directory，而是在确认 Provider closing 后直接把本地 invoker 摘掉。

### 12.3 旧注册数据把实例加回来

解决方式是 tombstone：

```text
closing 实例短时间禁止重建
```

这解决的是旧 add/update 事件晚到导致实例复活的问题。

### 12.4 请求还没处理完就退出

解决方式是请求排空：

```text
ProviderActiveCount
ConsumerActiveCount
offlineRequestWindowTimeout
step timeout / global timeout
```

系统尽量等待存量请求处理完，但不会无限等待。

### 12.5 active count 瞬间归零误判

解决方式是结合最近请求时间窗口：

```text
activeCount == 0
并且最近窗口内没有新请求
```

这比单看计数更稳。

### 12.6 第一次请求失败后继续失败

解决方式是识别连接关闭类错误：

```text
connection closing error
-> markClosingInvoker()
-> ClosingEvent
-> RemoveClosingInstance()
```

即使没有拿到 `closing=true` 响应，也能通过错误类型做兜底摘除。

---

## 13. 源码阅读顺序：不要一上来就陷进细节

如果顺着代码看，建议不要从某个 filter 或某个 invoker 直接钻进去。

更好的阅读顺序是：

> 先看总控编排，再看协议通知，再看 Consumer 侧怎么把信号变成 Directory 删除动作。

![源码阅读路线](/blogs/dubbo-graceful_shutdown/5856b6bf21c0e9b5.png)

建议顺序如下：

| 顺序 | 文件                                          | 看什么                                              |
| ---- | --------------------------------------------- | --------------------------------------------------- |
| 1    | `graceful_shutdown/shutdown.go`               | 整体下线编排，Provider 下线主流程                   |
| 2    | `common/extension/graceful_shutdown.go`       | 协议级 graceful shutdown callback 如何注册          |
| 3    | `protocol/grpc/grpc_protocol.go`              | gRPC Provider 下线时如何设置 `NOT_SERVING`          |
| 4    | `protocol/grpc/grpc_invoker.go`               | gRPC Consumer 如何 watch health                     |
| 5    | `protocol/triple/triple.go`                   | Triple Provider 如何设置 `NOT_SERVING`              |
| 6    | `protocol/triple/triple_invoker.go`           | Triple Consumer 如何 watch health                   |
| 7    | `protocol/triple/client.go`                   | `healthClient` 为什么要单独存在                     |
| 8    | `filter/graceful_shutdown/provider_filter.go` | Provider 怎么计数、拒绝请求、写 closing attachment  |
| 9    | `filter/graceful_shutdown/consumer_filter.go` | Consumer 怎么识别 closing attachment 和连接关闭错误 |
| 10   | `graceful_shutdown/closing_handler.go`        | `ClosingEvent` 抽象                                 |
| 11   | `graceful_shutdown/closing_registry.go`       | ClosingEvent 怎么找到对应 Directory                 |
| 12   | `registry/directory/directory.go`             | `RemoveClosingInstance` 和 tombstone                |

源码阅读时，可以始终带着这个问题：

> 这段代码是在 Provider 侧发出下线信号，还是在 Consumer 侧把信号转成“本地摘除 invoker”？

只要按这个问题分类，代码就不会乱。

---

## 14. 最后总结

把 dubbo-go 的优雅下线压缩成两条线，就很好理解。

Provider 侧：

```text
收到信号
-> 进入 closing
-> 注册中心反注册
-> 主动通知 Consumer
-> 响应里带 closing=true
-> 拒绝新请求
-> 等待请求排空
-> 销毁协议和资源
```

Consumer 侧：

```text
收到 NOT_SERVING
或看到 closing=true
或识别连接关闭错误
-> 生成 ClosingEvent
-> 删除本地 invoker
-> 写 tombstone 防止复活
-> 后续请求不再选择这个 Provider
```

真正的核心不是“Provider 慢点关”，而是：

> 在 Provider 真正退出前，让 Consumer 尽快别再把新请求打过来。

这也是 dubbo-go 这套优雅下线设计最有价值的地方。

如果只看 Provider，会以为优雅下线就是反注册、等待、销毁。

但如果把 Consumer 本地 Directory 也放进来，就会发现它真正解决的是一个更细的问题：

> 当注册中心通知、长连接状态、请求响应、错误返回这些信号都可能不同步时，如何让 Consumer 尽快、稳定、不会被旧数据干扰地摘掉一个正在下线的 Provider。

这就是这套设计的精髓。