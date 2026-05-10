
> 目标仓库：[apache/dubbo-go](https://github.com/apache/dubbo-go)  
> 基准分支：`develop`  
> 相关讨论：[apache/dubbo-go discussions #3300](https://github.com/apache/dubbo-go/discussions/3300)  
> 相关问题：
>
> - [#2939: MetadataService V1 exported but meta-v=2.0.0](https://github.com/apache/dubbo-go/issues/2939)
> - [#3188: dubbo-go metadata report discussion](https://github.com/apache/dubbo-go/issues/3188)
> - [#3302: Nacos multi-provider directory only exposes one instance](https://github.com/apache/dubbo-go/issues/3302)

## 1. 背景

Dubbo 3 的服务发现模型正在从 **接口级注册** 逐步演进到 **应用级注册**。

在应用级注册模式下，注册中心只应该保存轻量的应用实例信息。完整的服务元数据，例如导出的接口、协议、端口、方法、参数和服务定义，应通过 metadata 系统获取。

dubbo-go 已经具备一套 metadata 基础能力：

- `metadata/metadata_service.go`
  - `MetadataService`
  - `DefaultMetadataService`
  - MetadataService V1 导出
  - MetadataService V2 导出
- `metadata/info/metadata_info.go`
  - `MetadataInfo`
  - `ServiceInfo`
- `metadata/client.go`
  - 本地 metadata RPC 拉取
  - 远程 metadata report 拉取
- `registry/servicediscovery/service_discovery_registry.go`
  - provider 侧应用级服务发现注册
- `registry/servicediscovery/service_instances_changed_listener_impl.go`
  - consumer 侧实例变更处理
  - 按 revision 获取 metadata
  - 根据 metadata 生成 provider URL

但是当前 `develop` 分支仍然存在几个问题：

1. MetadataService V1 / V2 的导出策略不够显式。
2. `meta-v` 可能和实际导出的 MetadataService 版本不一致。
3. `metadata-service-protocol` 已经存在于配置结构中，但没有完整传递到 metadata 初始化流程。
4. `MetadataInfo` 的 revision 计算方式和 Java Dubbo 尚未完全对齐。
5. consumer 侧 metadata 缓存只使用 `revision` 作为 key，可能导致不同应用之间的缓存冲突。
6. `develop` 分支已经增强了多 provider URL 生成逻辑，但应用级实例语义、endpoint metadata 和回归测试仍需收敛。
7. dubbo-go 的 MetadataServiceV2 proto 落后于当前 Java Dubbo 契约。

本设计的目标是让 dubbo-go metadata 机制在兼容性、确定性和生产可用性上进一步收敛。

---

## 2. 目标

### 2.1 功能目标

1. 支持 provider 侧 MetadataService V1 和 V2 导出。
2. 支持 `local` 和 `remote` 两种 metadata 存储模式。
3. 支持将应用级 metadata 发布到 metadata report。
4. 支持 consumer 按应用实例 revision 拉取 metadata。
5. 支持 Java Dubbo 3.3 consumer 调用 dubbo-go provider 的 metadata 服务。
6. 支持 dubbo-go consumer 调用 Java Dubbo 3.3 provider 的 metadata 服务。
7. 支持同一应用下的多个 provider 实例。
8. 支持同一应用实例暴露多个协议端口。
9. 保证 `meta-v` 严格匹配实际导出的 MetadataService 版本。
10. 避免 metadata 拉取失败导致 consumer panic。

### 2.2 非目标

第一阶段不要求实现完整 OpenAPI 生成能力。

但是 MetadataServiceV2 的 proto 和服务描述应该对齐 Java Dubbo，包含 `GetOpenAPIInfo`。第一阶段可以先返回空定义。

---

## 3. 当前状态

### 3.1 MetadataInfo

当前 dubbo-go 的 `MetadataInfo` 模型大致如下：

```go
type MetadataInfo struct {
    App      string
    Revision string
    Tag      string
    Services map[string]*ServiceInfo

    exportedServiceURLs   map[string][]*common.URL
    subscribedServiceURLs map[string][]*common.URL
}
```

`MetadataInfo` 负责记录当前应用导出和订阅的服务信息。

主要文件：

```text
metadata/info/metadata_info.go
```

### 3.2 MetadataService

当前 dubbo-go 的 `MetadataService` 接口大致如下：

```go
type MetadataService interface {
    GetExportedURLs(serviceInterface string, group string, version string, protocol string) ([]*common.URL, error)
    GetExportedServiceURLs() ([]*common.URL, error)
    GetSubscribedURLs() ([]*common.URL, error)
    Version() (string, error)
    GetMetadataInfo(revision string) (*info.MetadataInfo, error)
    GetMetadataServiceURL() (*common.URL, error)
}
```

主要文件：

```text
metadata/metadata_service.go
```

### 3.3 MetadataService V2 Proto

当前 dubbo-go V2 proto 只有：

```proto
service MetadataServiceV2 {
    rpc GetMetadataInfo(MetadataRequest) returns (MetadataInfoV2);
}
```

主要文件：

```text
metadata/triple_api/proto/metadata_service_v2.proto
```

当前 Java Dubbo V2 proto 包含：

```proto
service MetadataServiceV2 {
    rpc GetMetadataInfo(MetadataRequest) returns (MetadataInfoV2);
    rpc GetOpenAPIInfo(OpenAPIRequest) returns (OpenAPIInfo);
}
```

因此 dubbo-go 应该对齐 Java Dubbo 的 V2 proto 契约。

### 3.4 ServiceInstance Metadata Keys

dubbo-go 已经定义了关键的实例 metadata 常量：

```go
ExportedServicesRevisionPropertyName   = "dubbo.metadata.revision"
SubscribedServicesRevisionPropertyName = "dubbo.subscribed-services.revision"
MetadataStorageTypePropertyName        = "dubbo.metadata.storage-type"
MetadataServiceURLParamsPropertyName   = "dubbo.metadata-service.url-params"
MetadataServiceURLsPropertyName        = "dubbo.metadata-service.urls"
MetadataVersion                        = "meta-v"
ServiceInstanceEndpoints               = "dubbo.endpoints"
```

主要文件：

```text
common/constant/key.go
```

这些 key 与 Java Dubbo 的应用实例 metadata 模型基本一致。

---

## 4. 设计概览

metadata 整体流程如下：

<img src="https://telegraph-image-92x.pages.dev/file/79f6e9012f032cc82479c-218cf49569e96e1081.png" alt="metadata" style="zoom: 50%;" />

核心原则：

1. 注册中心实例 metadata 应保持轻量。
2. 完整服务信息应保存在 `MetadataInfo` 中。
3. consumer 使用 `revision` 判断是否需要重新拉取 metadata。
4. `local` 模式下，consumer 通过 provider 的 MetadataService RPC 拉取 metadata。
5. `remote` 模式下，consumer 从 metadata report 拉取 metadata。
6. `meta-v` 必须匹配实际导出的 MetadataService 版本。

---

## 5. Metadata 存储模式

### 5.1 Local 模式

配置：

```yaml
dubbo:
  application:
    metadata-type: local
```

行为：

1. provider 导出本地 MetadataService。
2. provider 在服务实例 metadata 中写入：
   - `dubbo.metadata.storage-type=local`
   - `dubbo.metadata.revision={revision}`
   - `dubbo.metadata-service.url-params={...}`
   - `meta-v=1.0.0` 或 `meta-v=2.0.0`
3. consumer 收到服务实例变更事件。
4. consumer 根据实例 metadata 构造 MetadataService URL。
5. consumer 调用 MetadataService RPC 获取完整 `MetadataInfo`。

### 5.2 Remote 模式

配置：

```yaml
dubbo:
  application:
    metadata-type: remote

  metadata-report:
    protocol: nacos
    address: 127.0.0.1:8848
```

行为：

1. provider 不需要导出本地 MetadataService。
2. provider 将 `MetadataInfo` 发布到 metadata report。
3. provider 在服务实例 metadata 中写入：
   - `dubbo.metadata.storage-type=remote`
   - `dubbo.metadata.revision={revision}`
4. consumer 通过 `app + revision` 从 metadata report 获取 `MetadataInfo`。

主要文件：

```text
metadata/report_instance.go
metadata/client.go
```

---

## 6. MetadataService 版本策略

### 6.1 问题

一个已知兼容性问题是：

```text
instance metadata:
  meta-v = 2.0.0

provider actually exported:
  org.apache.dubbo.metadata.MetadataService, version=1.0.0
```

这种情况下，Java Dubbo 3.x consumer 可能会尝试调用：

```text
org.apache.dubbo.metadata.MetadataServiceV2:2.0.0
```

但 dubbo-go provider 实际只导出了 MetadataService V1，可能产生类似错误：

```text
don't have this exporter, key: {app}/org.apache.dubbo.metadata.MetadataServiceV2:2.0.0
```

因此，`meta-v` 不能只从业务协议或 endpoint 信息推断，必须来自实际 MetadataService 导出结果。

### 6.2 策略模型

引入统一的导出策略：

```go
type MetadataServiceExportStrategy struct {
    Protocol string
    ExportV1 bool
    ExportV2 bool
    V1URL    *common.URL
    V2URL    *common.URL
}
```

建议规则：

| metadata-type | metadata-service-protocol |                          Export V1 |                          Export V2 | meta-v                         |
| ------------- | ------------------------- | ---------------------------------: | ---------------------------------: | ------------------------------ |
| local         | dubbo                     |                                yes |                                 no | 1.0.0                          |
| local         | tri                       |                                yes |                                yes | 2.0.0                          |
| remote        | any                       |                                 no |                                 no | not required                   |
| local         | empty                     | follow default protocol resolution | follow default protocol resolution | derived from successful export |

V2-only metadata export 不是 dubbo-go 现有配置，不应在第一阶段引入。如果社区后续需要 V2-only 模式，应该作为单独的兼容性决策讨论。

硬性规则：

```text
meta-v=2.0.0 only if MetadataServiceV2 is actually exported and reachable.
```

实现上不能只根据 `dubbo.metadata-service.url-params` 推断 `meta-v`。应该在 MetadataService 导出完成后，根据导出策略解析版本：

```go
func ResolveMetadataVersion(strategy MetadataServiceExportStrategy) string {
    if strategy.ExportV2 && strategy.V2URL != nil {
        return constant.MetadataServiceV2Version
    }
    if strategy.ExportV1 && strategy.V1URL != nil {
        return constant.MetadataServiceV1Version
    }
    return ""
}
```

如果某个协议导出路径目前无法返回 error，也应该只在 exporter 对象创建成功后记录 capability。V2 导出失败或被跳过时，绝不能发布 `meta-v=2.0.0`。

---

## 7. 配置设计

当前 `ApplicationConfig` 已经有类似字段：

```go
MetadataType            string
MetadataServicePort     string
MetadataServiceProtocol string
```

主要文件：

```text
global/application_config.go
config/application_config.go
```

metadata 初始化时应该确保 `MetadataServiceProtocol` 被传入 metadata options。

建议修改：

```go
func initMetadata(rc *RootConfig) error {
    opts := metadata.NewOptions(
        metadata.WithAppName(rc.Application.Name),
        metadata.WithMetadataType(rc.Application.MetadataType),
        metadata.WithPort(getMetadataPort(rc)),
        metadata.WithMetadataProtocol(rc.Application.MetadataServiceProtocol),
    )
    return opts.Init()
}
```

第一阶段的最小改动是打通 `MetadataServiceProtocol`，并在该配置为空时保持当前默认行为。基于 `rc.Protocols` 自动推断协议可以后续再做，但必须配套明确的兼容性测试。

用户配置示例：

```yaml
dubbo:
  application:
    name: demo-provider
    metadata-type: local
    metadata-service-protocol: tri
    metadata-service-port: 20881

  protocols:
    tri:
      name: tri
      port: 50051

  registries:
    nacos:
      protocol: nacos
      address: 127.0.0.1:8848
      registry-type: service
```

主要更新文件：

```text
config/metadata_config.go
metadata/options.go
```

---

## 8. MetadataInfo 设计

### 8.1 增加线程安全

当前 metadata 使用全局 map，建议通过 manager 统一保护。

建议模型：

```go
type MetadataManager struct {
    mu    sync.RWMutex
    infos map[string]*info.MetadataInfo
}
```

对外 API 保持兼容：

```go
func GetMetadataInfo(registryId string) *info.MetadataInfo
func AddService(registryId string, url *common.URL)
func RemoveService(registryId string, url *common.URL)
func AddSubscribeURL(registryId string, url *common.URL)
func RemoveSubscribeURL(registryId string, url *common.URL)
```

主要文件：

```text
metadata/metadata.go
```

### 8.2 Revision 计算

revision 计算应迁移到 `MetadataInfo` 内部。

建议 API：

```go
func (m *MetadataInfo) CalAndGetRevision() string {
    m.mu.Lock()
    defer m.mu.Unlock()

    if m.Revision != "" && !m.updated {
        return m.Revision
    }

    if len(m.Services) == 0 {
        m.Revision = "0"
        m.updated = false
        return m.Revision
    }

    m.Revision = m.calRevisionLocked()
    m.updated = false
    return m.Revision
}
```

确定性计算方式：

```go
func (m *MetadataInfo) calRevisionLocked() string {
    keys := make([]string, 0, len(m.Services))
    for key := range m.Services {
        keys = append(keys, key)
    }
    sort.Strings(keys)

    var builder strings.Builder
    builder.WriteString(m.App)

    for _, key := range keys {
        builder.WriteString(m.Services[key].ToDescString())
    }

    return revision.Resolve(builder.String())
}
```

`ServiceInfo.ToDescString()`：

```go
func (s *ServiceInfo) ToDescString() string {
    return s.GetMatchKey() +
        strconv.Itoa(s.Port) +
        s.Path +
        sortedParamsString(s.Params)
}
```

只有稳定的服务语义应参与 revision。timestamp、进程本地地址，以及其他不会改变可调用服务行为的噪声字段必须排除。参与计算的字段应从现有 metadata `IncludeKeys` 出发，并与 Java Dubbo 的 `MetadataInfo` revision 行为对齐后再扩展。

该设计更接近 Java Dubbo 当前 `MetadataInfo.calRevision()` 的语义，即：

```text
app + sorted service desc strings
```

主要更新文件：

```text
metadata/info/metadata_info.go
registry/servicediscovery/customizer/service_revision_customizer.go
```

---

## 9. MetadataService V1 / V2 导出

### 9.1 MetadataService V1

服务名：

```text
org.apache.dubbo.metadata.MetadataService
```

版本：

```text
1.0.0
```

用途：

- 保留 MetadataService V1 作为 legacy 和迁移 fallback。
- 在 V2 不可用时支持 dubbo 协议下的 metadata service。
- 避免破坏仍依赖 V1 metadata 调用的现有 dubbo-go 用户。

Dubbo 2.7 兼容性不是本工作的主要设计目标。主要目标应是 Java Dubbo 3.3 和当前 dubbo-go `develop`。V1 应作为低成本 fallback 保留，但第一阶段不应增加 2.7 专属逻辑，也不应把 2.7 作为硬性验收要求。

### 9.2 MetadataService V2

服务名：

```text
org.apache.dubbo.metadata.MetadataServiceV2
```

版本：

```text
2.0.0
```

协议：

```text
tri
```

必需方法：

```text
GetMetadataInfo
GetOpenAPIInfo
```

第一阶段 `GetOpenAPIInfo` 可先返回空定义：

```go
func (m *MetadataServiceV2) GetOpenAPIInfo(
    ctx context.Context,
    req *tripleapi.OpenAPIRequest,
) (*tripleapi.OpenAPIInfo, error) {
    return &tripleapi.OpenAPIInfo{Definition: ""}, nil
}
```

主要更新文件：

```text
metadata/triple_api/proto/metadata_service_v2.proto
metadata/metadata_service.go
```

---

## 10. ServiceInstance Metadata

provider 应向应用实例写入以下 metadata：

```text
dubbo.metadata.storage-type = local | remote
dubbo.metadata.revision = {revision}
dubbo.subscribed-services.revision = {revision}
dubbo.metadata-service.url-params = {...}
dubbo.metadata-service.urls = [...]
dubbo.endpoints = [{"protocol":"tri","port":50051},{"protocol":"dubbo","port":20880}]
meta-v = 1.0.0 | 2.0.0
```

### 10.1 `dubbo.metadata-service.url-params`

示例：

```json
{
  "protocol": "tri",
  "port": "20881",
  "version": "2.0.0",
  "release": "dubbo-golang-3.x.x"
}
```

主要文件：

```text
registry/servicediscovery/customizer/metadata_service_url_params_customizer.go
```

该 JSON 描述的是 metadata service endpoint，而不是业务服务 endpoint。如果 V1 和 V2 都通过 triple 导出，该字段可以指向优先使用的 V2-capable endpoint，但 `meta-v` 的事实来源仍然是导出策略。

### 10.2 `meta-v`

`meta-v` 应来自实际导出策略：

```go
func ResolveMetadataVersion(strategy MetadataServiceExportStrategy) string {
    if strategy.ExportV2 {
        return constant.MetadataServiceV2Version
    }
    if strategy.ExportV1 {
        return constant.MetadataServiceV1Version
    }
    return ""
}
```

主要文件：

```text
registry/servicediscovery/customizer/metadata_service_version_customizer.go
```

当前 customizer 通过 `dubbo.metadata-service.url-params` 推导 `meta-v`，这不够可靠。因为 URL params 可以显示 `tri`，但 V2 导出未必真的成功。customizer 应读取已记录的 metadata service 导出 capability。

### 10.3 `dubbo.endpoints`

`dubbo.endpoints` 应描述同一应用实例暴露的所有协议端口：

```json
[
  {"protocol": "tri", "port": 50051},
  {"protocol": "dubbo", "port": 20880}
]
```

consumer 应根据 `ServiceInfo.Protocol` 选择正确 endpoint。

主要文件：

```text
registry/service_instance.go
registry/servicediscovery/customizer/
```

---

## 11. Provider 生命周期

### 11.1 服务导出

预期流程：

```text
ServiceOptions.Export()
    -> build provider URL
    -> registry protocol Register(url)
    -> metadata.AddService(registryId, url)
    -> serviceNameMapping.Map(url)
```

主要文件：

```text
server/action.go
registry/servicediscovery/service_discovery_registry.go
metadata/metadata.go
```

### 11.2 注册应用实例

建议 provider 侧注册流程：

```go
func (s *serviceDiscoveryRegistry) RegisterService() error {
    registryId := s.url.GetParam(constant.RegistryIdKey, constant.DefaultKey)

    metaInfo := metadata.GetMetadataInfo(registryId)
    if metaInfo == nil {
        return fmt.Errorf("metadata info not found, registry id = %s", registryId)
    }

    revision := metaInfo.CalAndGetRevision()

    if metadata.GetMetadataType() == constant.RemoteMetadataStorageType {
        report := metadata.GetMetadataReportByRegistry(registryId)
        if report == nil {
            return errors.New("metadata report not found")
        }
        if err := report.PublishAppMetadata(metaInfo.App, revision, metaInfo.Clone()); err != nil {
            return err
        }
    }

    instance := createInstance(metaInfo)
    instance.GetMetadata()[constant.ExportedServicesRevisionPropertyName] = revision

    return s.serviceDiscovery.Register(instance)
}
```

重要语义变更：

```text
One application process should register one application instance once.
```

不要为每个导出的 service URL 注册一个应用实例。多协议和多端口应通过：

```text
dubbo.endpoints
```

表示。

该语义变更影响较大，应放在 metadata 协议和 `meta-v` 修复之后，并通过集成测试保护。

---

## 12. Consumer 生命周期

当前 consumer 流程应保留并增强：

```text
ServiceInstancesChangedEvent
    -> group instances by app + revision
    -> get MetadataInfo from cache
    -> if cache miss:
         local: fetch from MetadataService RPC
         remote: fetch from MetadataReport
    -> MetadataInfo.Services
    -> instance.ToURLs(serviceInfo)
    -> notify registry directory
```

主要文件：

```text
registry/servicediscovery/service_instances_changed_listener_impl.go
```

### 12.1 Metadata 获取

metadata 获取应继续基于 storage-type 判断：

```go
if storageType == constant.RemoteMetadataStorageType {
    metadataInfo, err = metadata.GetMetadataFromMetadataReport(revision, instance)
} else {
    metadataInfo, err = metadata.GetMetadataFromRpc(revision, instance)
}
```

主要文件：

```text
metadata/client.go
```

### 12.2 本地 RPC 获取 fallback

建议 fallback 顺序：

```text
1. 如果 meta-v=2.0.0，先调用 MetadataServiceV2.GetMetadataInfo。
2. 如果 V2 失败且存在 V1 参数，则回退到 MetadataService V1。
3. 如果响应是 string，则按 JSON 解析以支持迁移兼容。
4. 如果某个实例失败，则尝试同一 app + revision 下的其他实例。
5. 如果全部失败，则跳过该 revision 并记录 warning，不能 panic。
```

必需实现细节：

```text
1. 如果 dubbo.metadata-service.url-params 缺失或非法，不能解引用 nil URL。
2. 标准路径优先使用 dubbo.metadata-service.url-params。
3. 如果 url-params 无法构造可用 URL，尝试 dubbo.metadata-service.urls。
4. V2 fallback 到 V1 时，重建 URL：
   - interface/path = org.apache.dubbo.metadata.MetadataService
   - version = 1.0.0
   - method = getMetadataInfo
5. 只有返回非 nil 且包含服务信息的 MetadataInfo 后才写入缓存。
```

### 12.3 Cache Key

当前缓存不能只使用 revision。

推荐 cache key：

```text
{app}:{revision}
```

原因：

```text
不同应用可能生成相同 revision。
只使用 revision 会导致跨应用 metadata 缓存冲突。
```

---

## 13. 兼容性矩阵

| Provider       | Consumer       | metadata-type | MetadataService           | 预期                          |
| -------------- | -------------- | ------------- | ------------------------- | ----------------------------- |
| dubbo-go       | dubbo-go       | local         | V1/V2                     | OK                            |
| dubbo-go       | dubbo-go       | remote        | metadata report           | OK                            |
| dubbo-go       | Java Dubbo 3.3 | local + tri   | V2 preferred, V1 fallback | OK                            |
| dubbo-go       | Java Dubbo 3.3 | remote        | metadata report           | OK                            |
| Java Dubbo 3.3 | dubbo-go       | local         | V2 preferred, V1 fallback | OK                            |
| Java Dubbo 3.3 | dubbo-go       | remote        | metadata report           | OK                            |
| dubbo-go       | Java Dubbo 2.7 | local         | V1                        | Best effort / legacy fallback |
| Java Dubbo 2.7 | dubbo-go       | local         | V1                        | Best effort / legacy fallback |

关键兼容性规则：

```text
meta-v must match an actually exported MetadataService version.
```

Java Dubbo 2.7 兼容性应视为 legacy 迁移支持，而不是主线目标。本设计不应围绕 Dubbo 2.7 的应用级服务发现机制优化，因为目标基准是 Dubbo 3.x 的 metadata 和服务发现行为。

---

## 14. 错误处理

metadata 是服务发现关键路径的一部分。一个异常 provider 实例不能导致 consumer 崩溃。

必需行为：

1. Metadata RPC 失败返回 error，不能 panic。
2. Metadata 反序列化失败时跳过当前实例。
3. 如果一个实例失败，则尝试同一 `app + revision` 下的其他实例。
4. 空 metadata 不应写入缓存。
5. 缺失 revision 时记录 warning 并跳过。
6. `meta-v=2.0.0` 但 V2 调用失败时，应在可能的情况下回退到 V1。
7. `url-params` 非法时，应尽可能回退到 `dubbo.metadata-service.urls`。

---

## 15. 指标和日志

建议指标：

```text
metadata.push.rt
metadata.subscribe.rt
metadata.rpc.fetch.rt
metadata.report.fetch.rt
metadata.cache.hit
metadata.cache.miss
metadata.fetch.error
```

建议日志：

```text
[METADATA_REGISTER] metadata revision changed: old -> new, app: demo, services: 3
[METADATA_REGISTER] publish remote metadata app=demo revision=xxx
[METADATA_SERVICE] export V1 url=...
[METADATA_SERVICE] export V2 url=...
[METADATA_SUBSCRIBE] fetch metadata app=demo revision=xxx storage=local
[METADATA_SUBSCRIBE] cache hit app=demo revision=xxx
[METADATA_SUBSCRIBE] fallback V2 -> V1 app=demo revision=xxx
```

---

## 16. 测试计划

### 16.1 单元测试

#### MetadataInfo

- `AddService` 正确更新 services。
- `RemoveService` 正确更新 services。
- 相同服务用不同插入顺序生成相同 revision。
- 参数变化会导致 revision 变化。
- 方法级参数变化会导致 revision 变化。
- 空 services 返回 revision `"0"`。

#### MetadataService Strategy

- `metadata-service-protocol=dubbo` 只导出 V1。
- `metadata-service-protocol=tri` 导出 V1 + V2。
- `metadata-type=remote` 不导出本地 MetadataService。
- `meta-v` 匹配已记录的成功导出结果。
- V2 导出失败时绝不生成 `meta-v=2.0.0`。

#### Proto Conversion

- `MetadataInfo -> MetadataInfoV2` 不丢字段。
- `MetadataInfoV2 -> MetadataInfo` 不丢字段。
- `ServiceInfo.Port`、`Path` 和 `Params` 正确转换。
- V2 转换保留 `ServiceInfo.Port`。

#### Metadata Cache

- 相同 app 和相同 revision 复用 metadata。
- 不同 app 即使 revision 相同，也不共享 metadata cache entry。
- nil 或空 metadata 不写入缓存。

### 16.2 集成测试

#### Local Metadata

```text
Go provider:
  metadata-type=local
  metadata-service-protocol=tri

Go consumer:
  service discovery subscribe
  fetch MetadataServiceV2
  generate provider URL
  invoke successfully
```

#### Remote Metadata

```text
Go provider:
  metadata-type=remote
  metadata-report=nacos

Go consumer:
  service discovery subscribe
  fetch metadata from metadata report
  invoke successfully
```

#### Java Dubbo 3.3 Compatibility

```text
Java Dubbo 3.3 consumer -> Go provider V2
Java Dubbo 3.3 consumer -> Go provider V1 fallback
Go consumer -> Java Dubbo 3.3 provider V2
Go consumer -> Java Dubbo 3.3 provider V1 fallback
```

Dubbo 2.7 应作为 best-effort legacy 场景，在实际可行时由 V1 fallback 覆盖，但不应阻塞第一阶段验收。

#### Multi-provider

```text
same application, 3 provider instances:
  port=20000
  port=20001
  port=20002

consumer should see 3 provider URLs.
```

#### Multi-protocol

```text
same provider exposes:
  tri:50051
  dubbo:20880

instance metadata should contain:
  dubbo.endpoints=[tri, dubbo]

consumer should generate URLs according to ServiceInfo.Protocol.
```

---

## 17. 实施计划

### PR 1：修复 MetadataService Protocol 配置

范围：

```text
config/metadata_config.go
metadata/options.go
```

任务：

- 将 `Application.MetadataServiceProtocol` 传递给 metadata options。
- 增加 metadata export strategy。
- 确保 `metadata-type=remote` 不导出本地 MetadataService。
- 当 `metadata-service-protocol` 为空时保持当前默认行为。
- 增加单元测试。

### PR 2：对齐 MetadataService V2 Proto

范围：

```text
metadata/triple_api/proto/metadata_service_v2.proto
metadata/metadata_service.go
```

任务：

- 增加 `GetOpenAPIInfo`。
- 增加 `OpenAPIRequest`。
- 增加 `OpenAPIInfo`。
- 增加 `OpenAPIFormat`。
- 实现返回空定义的 `GetOpenAPIInfo`。
- 重新生成 generated code。
- 更新 service descriptor。

### PR 3：修复 `meta-v` 生成

范围：

```text
registry/servicediscovery/customizer/metadata_service_version_customizer.go
metadata/metadata_service.go
```

任务：

- 根据实际 export strategy 生成 `meta-v`。
- 确保只有 V2 实际导出时才生成 `meta-v=2.0.0`。
- 停止只根据 `dubbo.metadata-service.url-params` 推导 `meta-v`。
- 增加 Java Dubbo 3.3 consumer 兼容性测试。

### PR 4：将 Revision 计算迁移到 MetadataInfo

范围：

```text
metadata/info/metadata_info.go
registry/servicediscovery/customizer/service_revision_customizer.go
```

任务：

- 增加 `CalAndGetRevision()`。
- 增加 `ServiceInfo.ToDescString()`。
- 替换 customizer 中的 revision 逻辑。
- 增加确定性 revision 测试。

### PR 5：增强 Consumer Metadata Fetch

范围：

```text
metadata/client.go
registry/servicediscovery/service_instances_changed_listener_impl.go
```

任务：

- 将 cache key 改成 `{app}:{revision}`。
- 增加 V2 -> V1 fallback。
- 避免 nil metadata 导致 panic。
- 当 `url-params` 非法时 fallback 到 `dubbo.metadata-service.urls`。
- 不缓存 nil 或空 metadata。
- 当某个实例失败时尝试同 revision 下的其他实例。
- 增加集成测试。

### PR 6：收敛应用级实例语义

范围：

```text
registry/servicediscovery/service_discovery_registry.go
registry/service_instance.go
registry/servicediscovery/customizer/
```

任务：

- 用回归测试保护 `develop` 分支已有的多 provider URL 生成行为。
- 确认 provider 注册应继续保持“每个导出 URL 一个实例”，还是收敛为“每个进程一个应用实例”。
- 如果改为每个进程一个应用实例，则使用 `dubbo.endpoints` 表达多协议端口。
- 在改变注册语义前，先补齐 Nacos 多 provider 和多协议集成测试。
- 不要把注册语义变更和 metadata protocol / `meta-v` 修复放在同一个 PR 中。

---

## 18. 验收标准

1. 配置 `metadata-service-protocol: tri` 时，provider 实际导出 `MetadataServiceV2`。
2. 当 `meta-v=2.0.0` 时，Java Dubbo 3.3 consumer 可以调用 dubbo-go provider 的 `MetadataServiceV2.GetMetadataInfo`。
3. 配置 `metadata-service-protocol: dubbo` 时，不能写出 `meta-v=2.0.0`。
4. `metadata-type=remote` 时，provider 不依赖本地 MetadataService，consumer 能从 metadata report 获取 metadata。
5. 多 provider 场景下，consumer directory 能看到所有 provider URL，并且有回归测试保护。
6. 多协议场景下，consumer 能根据 `ServiceInfo.Protocol` 选择正确 endpoint。
7. metadata 拉取失败不会导致 panic。
8. 相同 `{app}:{revision}` 不会重复拉取 metadata。
9. revision 变化会触发 metadata 刷新。
10. Go / Java Dubbo 3.3 双向 metadata 兼容性测试通过。
11. 不同应用即使 revision 相同，也不会共享 metadata 缓存。

---

## 19. 推荐顺序

推荐顺序：

1. 修复 `metadata-service-protocol` 传递。
2. 修复基于实际导出结果的 `meta-v` 生成。
3. 对齐 MetadataServiceV2 proto 与 Java Dubbo。
4. 增加小范围兼容性测试。
5. 然后再继续 revision 计算、cache key 和注册语义收敛。

这些改动足够小，同时又能解决真实的 Java / Go 互操作问题。

---

## 20. 总结

dubbo-go 不需要从零重建 metadata 系统。

正确方向是增强现有架构：

```text
MetadataInfo
+ MetadataService V1/V2
+ ServiceInstance metadata
+ MetadataReport
+ Consumer metadata fetch by revision
```

最重要的设计规则是：

```text
Service instance metadata must describe the actual provider capability.
```

具体来说：

```text
meta-v=2.0.0 means MetadataServiceV2 is actually exported and reachable.
```

只要这一点成立，Java Dubbo 与 dubbo-go 的 metadata 互操作就会更可预测。