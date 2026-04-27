# Claude Code 安装指南

## 一、安装 Node.js

首先确认 Node.js 和 npm 已安装：

```bash
node --version
npm --version
```

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/61a8554e9ac64a96b225b84eea24260f~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=xs851QAxFekzFOIesvQEVNkkK1k%3D)

------

## 二、安装 Git

Git 安装可参考：[Git 安装教程](https://link.juejin.cn/?target=https%3A%2F%2Fcloud.tencent.com%2Fdeveloper%2Ftools%2Fblog-entry%3Ftarget%3Dhttps%3A%2F%2Fblog.csdn.net%2F2302_79751907%2Farticle%2Fdetails%2F149173833%3Fops_request_misc%3D%257B%2522request%255Fid%2522%253A%252287fe87db6f35ad7b3c53e51810901f4d%2522%252C%2522scm%2522%253A%252220140713.130102334.pc%255Fblog.%2522%257D%26request_id%3D87fe87db6f35ad7b3c53e51810901f4d%26biz_id%3D0%26utm_medium%3Ddistribute.pc_search_result.none-task-blog-2~blog~first_rank_ecpm_v1~rank_v31_ecpm-1-149173833-null-null.nonecase%26utm_term%3Dgit%26spm%3D1018.2226.3001.4450%26objectId%3D2602920%26objectType%3D1%26contentType%3Dundefined)

### 配置环境变量

如果命令行中 `git --version` 无法执行，需要配置环境变量：

1. 打开 **环境变量**
2. 进入 **用户变量** → **PATH**

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/6f6cb1baaa5c42209a37b590f8f5c4c6~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=rCWdw%2BG5ueXjTFd4xUItRib3irA%3D)

添加以下路径：

```makefile
E:\Git\Git\bin
E:\Git\Git\cmd
```

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/7fd020d399234580b7ef1e4e41403f16~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=u4nkvR5K4A7h99r5kFu2gmLV6HM%3D)

点击 **确定** → **确定** → **确定** 保存。

验证 Git 是否安装成功：

```bash
git --version
```

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/8950c7cb4be04e77a3c3feb3fd7667a4~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=VNhvsnzfsCDp7izXsf0FlNZmX%2Bs%3D)

------

## 三、安装 Claude Code

使用 npm 全局安装：

```bash
npm install -g @anthropic-ai/claude-code
```

### 切换淘宝镜像（可选）

如果下载较慢，可切换为淘宝镜像：

```bash
npm config set registry https://registry.npmmirror.com
```

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/54c1e48066d846e3ac13446d6db38a72~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=EaapLQ5c7b1Ci3sGlC4yFsRghFE%3D)

------

## 四、配置代理（国内用户）

国内无法直接访问 Claude API，需要配置代理：

```bash
setx HTTP_PROXY  http://127.0.0.1:XXXX
setx HTTPS_PROXY http://127.0.0.1:XXXX
setx ALL_PROXY   http://127.0.0.1:XXXX
```

> 注意：将 `XXXX` 替换为你实际的代理端口号。

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/88f3724b106c4ea2a9313291664370ff~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=tzL1e1qDQbfume8AQymqvv0HnVk%3D)

验证代理配置：

```bash
echo %HTTP_PROXY%
echo %HTTPS_PROXY%
```

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/f372f5da43ee4776be7c4c0faa257ab9~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=gDsB1o7kAomDIoLqypjwRbVktYE%3D)

------

## 五、接入豆包 API（替代官方 Claude）

Claude Code 需开通 Claude 会员才能使用，可通过豆包模型的 API 来替代。

### 获取豆包 API Key

进入 [豆包 API](https://link.juejin.cn/?target=https%3A%2F%2Fcloud.tencent.com%2Fdeveloper%2Ftools%2Fblog-entry%3Ftarget%3Dhttps%3A%2F%2Fconsole.volcengine.com%2Fark%2Fregion%3Aark%2Bcn-beijing%2Fapikey%3Fapikey%3D%7B%7D%26objectId%3D2602920%26objectType%3D1%26contentType%3Dundefined)，找到 **API Key 管理**。

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/b42ccb250b054c03826bcde9ee4456ee~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=37n9BHfUEzP9D0G1wsoSWk9anoc%3D)

### 配置环境变量

进入 **控制中心** → **编辑系统环境变量** → **环境变量** → **新建**：

| 变量名                 | 值                                             |
| ---------------------- | ---------------------------------------------- |
| `ANTHROPIC_BASE_URL`   | `https://ark.cn-beijing.volces.com/api/coding` |
| `ANTHROPIC_AUTH_TOKEN` | 你的 API Key                                   |
| `ANTHROPIC_MODEL`      | `doubao-seed-code-preview-latest`              |

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/14495350ed3143599ea776962b0a74dd~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=crB0G3sYl0q3bhAqijKiTclafhE%3D)

> **重要**：环境变量设置完成后，必须点击三个 **确定** 才能生效。

也可通过命令行直接设置（当前会话生效）：

```bash
setx ANTHROPIC_AUTH_TOKEN 你的API密钥
setx ANTHROPIC_BASE_URL https://ark.cn-beijing.volces.com/api/coding
setx ANTHROPIC_MODEL doubao-seed-code-preview-latest
```

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/f368940c2b1c4e2f99f5be591d9bf9fa~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=mFi%2F0wjY8Sti2y%2F2BrzeIf6Cg1o%3D)

验证环境变量：

```bash
echo %ANTHROPIC_AUTH_TOKEN%
echo %ANTHROPIC_BASE_URL%
echo %ANTHROPIC_MODEL%
```

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/3de00fa5503c44ffb202a488e72f05c9~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=mKI%2Bg1ly8HPpScv5LT9ST03pABw%3D)

------

# 六、启动 Claude Code

在终端输入：

```bash
claude
```

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/3cce5d02048042bfbdb1c08496b9ce5d~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=vY7W4SrIq7Rs44yCJhooR3QQoyA%3D)

等待加载完成：

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/008ce13ba8274bcbb297921e9edf97aa~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=jWKdMtVCsOaIxsCBOWB4b7%2BdcrY%3D)

点击 **Yes** 接受配置（后续一路选择 Yes 即可）：

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/dc85501dbb3247229259ea0699f5c441~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=mbVIaRoVRGEE1aJu75joRY6xYc8%3D)

输入 `/status` 查看状态：

![img](https://p3-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/cf5d2e9470e74198bc708301276291b0~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361686&x-signature=wuh3sqXk%2BVNrX8CXDDyaWVakSJE%3D)

配置成功！