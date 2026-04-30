> 这篇讲 dubbo-go 的优雅下线。  
> 重点不是罗列源码，而是把一次 Provider 下线时，流量是怎么被摘掉的讲清楚。

## 1. 先看整体链路

dubbo-go 的优雅下线不是“收到信号后 sleep 几秒再退出”，而是一个分阶段的摘流量过程：

```text
收到 SIGTERM
  -> 标记 Provider 进入 closing
  -> 从注册中心反注册
  -> 主动通知长连接 Consumer
  -> 短时间继续接收请求，并在响应里带 closing 标记
  -> Consumer 本地删除这个 Provider 实例
  -> 防止旧注册数据把实例重新加回来
  -> 拒绝新请求
  -> 等待在途请求结束
  -> 销毁协议和资源
```

一句话概括：

> Provider 不是马上死，而是先告诉大家“别再调我”，等流量尽量挪走之后再退出。

这套链路里有四个核心角色：

| 角色      | 作用                          |
| --------- | ----------------------------- |
| Provider  | 准备下线的服务端              |
| Consumer  | 调用 Provider 的客户端        |
| Registry  | 注册中心，负责服务发现        |
| Directory | Consumer 本地的可调用实例列表 |

最关键的点是：Consumer 每次调用时通常不会实时查注册中心，而是从本地 Directory 里选一个 invoker。所以优雅下线不能只关注“Provider 有没有从注册中心删掉”，还要关注：

> Consumer 本地列表里的这个 Provider 有没有被及时删掉？

## 2. Provider 侧：先进入 closing，再逐步退出

Provider 收到停机信号后，会进入 `beforeShutdown()` 这条主流程。

它的顺序大致是：

```text
1. Closing = true
2. unregisterRegistries()
3. notifyLongConnectionConsumers()
4. waitAndAcceptNewRequests()
5. RejectRequest = true
6. 等待请求结束
7. destroyProtocols()
```

### 2.1 Closing = true：先告诉框架“我要下线了”

第一步不是关闭服务，而是把状态标成 closing。

这个状态的意思是：

> 我还活着，但我已经开始下线流程了。

后面很多逻辑都依赖这个状态：

- Provider 返回响应时会带 `closing=true`
- gRPC/Triple 会把 health 状态改成 `NOT_SERVING`
- Consumer 收到 closing 信号后，会把对应实例从本地 Directory 摘掉

所以 closing 更像一个“下线预告”，不是“已经关闭”。

### 2.2 反注册：先让注册中心别再分发我

第二步是从注册中心注销 Provider。

这里有一个重要设计：**反注册和销毁协议是分开的**。

不能一反注册就马上关服务，因为注册中心通知 Consumer 是异步的。Consumer 本地缓存可能还没刷新，如果 Provider 立刻退出，就会出现请求继续打过来但服务已经没了的情况。

所以合理顺序是：

```text
先从注册中心摘掉自己
服务继续活一小段时间
等待 Consumer 感知
处理完存量请求
最后再关协议和连接
```

## 3. 主动通知：gRPC / Triple 通过 health watch 提前告诉 Consumer

只靠注册中心有延迟，所以 dubbo-go 又加了一条主动通知路径。

主流程会调用协议注册的 graceful shutdown callback。gRPC 和 Triple 都会在这里做一件事：

```text
把服务健康状态从 SERVING 改成 NOT_SERVING
```

这个动作不是断连接，而是提前通知 Consumer：

> 我快下线了，你别再选我了。

### 3.1 gRPC 链路

gRPC Provider 正常 export 服务时，会把服务状态设为 `SERVING`。

Consumer 创建 gRPC invoker 时，会启动 health watch，持续监听服务状态。

Provider 下线时：

```text
gRPC callback
  -> SetAllServicesNotServing()
  -> Consumer health watch 收到 NOT_SERVING
  -> 生成 ClosingEvent
  -> 删除本地实例
```

### 3.2 Triple 链路

Triple 也是类似逻辑：

```text
Provider export
  -> serviceKey 标记为 SERVING

Consumer refer
  -> 创建 TripleInvoker
  -> 启动 Health.Watch

Provider 下线
  -> Triple callback 把 serviceKey 改成 NOT_SERVING

Consumer 收到 NOT_SERVING
  -> 生成 ClosingEvent
  -> 删除本地实例
```

Triple 这里有个小细节：它会单独创建一个 `healthClient`。

因为普通业务 client 是调业务接口的，而 health watch 调的是标准健康检查服务：

```text
grpc.health.v1.Health/Watch
```

所以可以简单理解为：

```text
业务 client：负责发业务请求
health client：负责监听服务健康状态
```

主动通知的价值是：Consumer 不用等注册中心慢慢推送，长连接上就能提前知道 Provider 要下线。

## 4. 被动通知：响应里带 closing=true

主动通知不一定覆盖所有 Consumer。

比如 Consumer 没开 health watch，或者协议不支持主动通知。这时如果还有请求打到 closing Provider，Provider 不会马上粗暴拒绝，而是可以正常处理，并在响应里带一个标记：

```text
closing = true
```

这个逻辑在 Provider filter 里：

```text
请求进来：
  ProviderActiveCount +1
  记录 ProviderLastReceivedRequestTime

请求返回：
  ProviderActiveCount -1
  如果 Closing = true，就在响应 attachment 里加 closing=true
```

它的意思是：

> 这次请求我给你处理完，但我已经在下线了，下次别再调我。

这是一条很实用的兜底链路。即使注册中心通知还没到，Consumer 也能通过一次正常响应知道 Provider 正在关闭。

## 5. Consumer 侧：收到 closing 后，必须真的不再选它

Consumer 感知到 Provider closing 以后，不能只是打日志。真正要做的是：

> 后续路由不要再选这个 Provider。

Consumer 现在有三种感知 closing 的方式：

```text
1. health watch 收到 NOT_SERVING
2. 响应 attachment 里有 closing=true
3. 调用失败，错误像是连接正在关闭
```

第 3 种是兜底。比如请求没拿到正常响应，直接遇到：

```text
transport is closing
client connection is closing
gRPC Unavailable
gRPC Canceled
client closed
invoker destroyed
```

Consumer 会认为这个 Provider 很可能正在关闭，于是也把它标记为 closing。

处理动作主要有两个：

```text
1. markClosingInvoker()
   把 invoker 标记为 closing / unavailable

2. handleClosingEvent()
   生成 ClosingEvent，交给统一处理器
```

这里的重点是：Consumer 不是等注册中心刷新，而是可以先在本地避开这个实例。

## 6. ClosingEvent：把不同来源的关闭信号统一起来

closing 信号来源很多：

- gRPC health watch
- Triple health watch
- response attachment
- connection closing error

如果每种来源都自己写一套删除逻辑，代码会很乱。

所以 dubbo-go 把它们统一成 `ClosingEvent`：

```text
Source      信号来源
ServiceKey  哪个服务
InstanceKey 哪个具体实例
Address     实例地址
```

然后统一交给 `ClosingEventHandler`。

处理器做的事情很简单：

```text
按 serviceKey 找到本地 Directory
调用 RemoveClosingInstance(instanceKey)
```

也就是说：

> 多种感知方式，最终都收敛到同一个“删除本地实例”的动作。

这一步是整个设计的中枢。

## 7. Directory：真正把实例从本地列表删掉

Consumer 本地 Directory 维护了当前可调用的 invoker 列表。

当 ClosingEventHandler 调用：

```text
RemoveClosingInstance(instanceKey)
```

RegistryDirectory 会做几件事：

```text
1. 加锁，避免和注册中心刷新并发冲突
2. 找到 cacheInvokersMap 里的目标 invoker
3. 写 tombstone
4. 删除这个 invoker
5. 重新构建可路由 invoker 列表
6. Destroy 被删除的 invoker
```

这一步完成后，负载均衡就不会再选到这个 Provider 了。

这也是 dubbo-go 方案里非常关键的变化：

> Consumer 已经知道 Provider 要下线时，可以直接本地摘掉，不用傻等注册中心通知收敛。

## 8. tombstone：防止旧注册数据把实例“复活”

这里还有一个容易忽略的问题。

Consumer 本地刚删掉 closing 实例，但注册中心可能还没完全收敛。某些旧的 add/update 事件可能晚到，把这个实例又加回本地 Directory。

链路可能变成这样：

```text
Consumer 收到 NOT_SERVING
  -> 删除本地实例

注册中心旧数据晚到
  -> Directory 又把实例加回来

请求再次打到正在下线的 Provider
```

所以删除 closing 实例时，会写一条 tombstone。

它可以理解成短期黑名单：

> 这个实例刚刚因为 closing 被删掉了，短时间内不要重新构建它。

后续如果旧注册数据想重建同一个 instanceKey，Directory 会先检查 tombstone：

```text
tombstone 还没过期 -> 跳过重建
tombstone 已过期 -> 允许正常重建
```

这个设计解决的是分布式系统里很常见的“旧数据晚到”问题。

没有 tombstone，本地快速摘除就可能被注册中心旧数据覆盖。

## 9. 请求排空：不只看 activeCount

等通知和摘流量做完后，Provider 还要等待请求排空。

这里有两个计数：

```text
ProviderActiveCount：别人打进来的请求
ConsumerActiveCount：当前进程自己发出去的请求
```

Provider 请求排空时，不只是看 `ProviderActiveCount == 0`。

因为某一瞬间 active count 可能刚好为 0，但马上又有请求进来。

所以还会看最近一次收到请求的时间：

```text
activeCount == 0
并且最近一个窗口期内没有新请求进来
```

也就是用：

```text
ProviderLastReceivedRequestTime + offlineRequestWindowTimeout
```

来避免“counter 瞬间为 0，但流量其实还没停”的误判。

之后才会进入更强硬的阶段：

```text
RejectRequest = true
```

这时新请求会被拒绝，框架继续等待已经发出或正在处理的请求结束，直到超时或完成。

## 10. 最后销毁协议

前面这些都完成后，才会执行协议销毁：

```text
destroyProtocols()
```

此时理想状态是：

```text
注册中心已经摘流量
长连接 Consumer 已收到 NOT_SERVING
普通 Consumer 已通过 closing=true 感知
本地 Directory 已删除 closing 实例
旧注册数据被 tombstone 拦住
新请求开始被拒绝
存量请求已经处理完或等到超时
```

这个时候再关闭 gRPC / Triple server，风险就小很多。

如果整个优雅下线超过总超时，最终还是会强制退出，避免进程一直卡住。

## 11. 用一条 Triple 链路串起来

把上面内容压成一次真实 Triple 下线：

```text
1. Triple Provider 正常启动
   -> export 服务
   -> health 状态设为 SERVING

2. Triple Consumer 引用服务
   -> 创建 TripleInvoker
   -> 启动后台 Health.Watch

3. Provider 收到 SIGTERM
   -> Closing = true
   -> 从注册中心反注册

4. Triple shutdown callback 执行
   -> serviceKey 状态改成 NOT_SERVING

5. Consumer 的 Health.Watch 收到 NOT_SERVING
   -> 生成 ClosingEvent

6. ClosingEventHandler 处理事件
   -> 按 serviceKey 找 Directory
   -> 按 instanceKey 删除 invoker

7. RegistryDirectory 删除实例
   -> 写 tombstone
   -> 删除 cacheInvokersMap
   -> 刷新可路由 invoker 列表

8. 后续如果注册中心旧数据晚到
   -> tombstone 命中
   -> 跳过重建

9. Provider 等待请求排空
   -> 开始拒绝新请求
   -> 最后销毁协议
```

这条链路的重点是：

> Consumer 不再等注册中心慢慢刷新，而是通过 health watch 先一步把下线实例从本地踢出去。

## 12. 这套设计解决了什么问题？

### 12.1 注册中心通知慢

靠三条路径补充：

```text
注册中心反注册
health watch 主动通知
response attachment 被动通知
```

### 12.2 Consumer 本地缓存更新慢

靠本地快速摘除：

```text
ClosingEvent -> RemoveClosingInstance
```

### 12.3 旧注册数据把实例加回来

靠 tombstone 拦住：

```text
closing 实例短时间内禁止重建
```

### 12.4 请求还没处理完就退出

靠计数和超时等待：

```text
ProviderActiveCount
ConsumerActiveCount
step timeout
```

### 12.5 active count 瞬间归零误判

靠滑动窗口：

```text
ProviderLastReceivedRequestTime
offlineRequestWindowTimeout
```

### 12.6 第一次请求失败后继续失败

靠错误识别兜底：

```text
connection closing error -> markClosingInvoker -> ClosingEvent
```

## 13. 源码阅读顺序

想顺着代码看，可以按这个顺序：

```text
1. graceful_shutdown/shutdown.go
   看整体下线编排

2. common/extension/graceful_shutdown.go
   看协议级 callback 怎么注册

3. protocol/grpc/grpc_protocol.go
   看 gRPC Provider 怎么设置 NOT_SERVING

4. protocol/grpc/grpc_invoker.go
   看 gRPC Consumer 怎么 watch health

5. protocol/triple/triple.go
   看 Triple Provider 怎么设置 NOT_SERVING

6. protocol/triple/triple_invoker.go
   看 Triple Consumer 怎么 watch health

7. protocol/triple/client.go
   看 Triple healthClient 的作用

8. filter/graceful_shutdown/provider_filter.go
   看 Provider 怎么计数、拒绝请求、写 closing attachment

9. filter/graceful_shutdown/consumer_filter.go
   看 Consumer 怎么识别 closing 和连接关闭错误

10. graceful_shutdown/closing_handler.go
    看 ClosingEvent 抽象

11. graceful_shutdown/closing_registry.go
    看 ClosingEvent 怎么找到 Directory

12. registry/directory/directory.go
    看 RemoveClosingInstance 和 tombstone
```

## 14. 总结

dubbo-go 的优雅下线可以用两条线理解。

Provider 侧：

```text
收到信号
进入 closing
注册中心反注册
主动通知 Consumer
响应里带 closing
拒绝新请求
等待请求排空
销毁协议
```

Consumer 侧：

```text
收到 NOT_SERVING
或看到 closing=true
或识别连接关闭错误
生成 ClosingEvent
删除本地 invoker
写 tombstone 防止复活
后续请求不再选这个 Provider
```

真正的核心不是“服务端慢慢关”，而是：

> 在 Provider 真正退出前，让 Consumer 尽快别再把新请求打过来。

这也是 dubbo-go 这套优雅下线设计最有价值的地方。