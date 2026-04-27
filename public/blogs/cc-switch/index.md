# 一、产品概述

近年来，AI 编程辅助工具已成为开发者的得力助手。常见的国产主流模型包括：Kimi、通义千问、DeepSeek、智谱 GLM、阶跃星辰等，各有其擅长的应用场景。

在使用过程中，开发者经常遇到以下痛点：

- **模型切换繁琐** — 需要同时使用多个国产模型或中转服务时，必须手动修改配置文件
- **配置管理复杂** — 多个 API Key、代理地址频繁切换，容易出错
- **工具维护困难** — 不同工具的 MCP 服务器、Skills、Prompts 分散管理，维护成本高
- **测试效率低下** — 更换模型测试效果时，需要重启终端、重新认证，流程冗长

本文为大家推荐一款开源桌面工具，能够有效解决上述问题。

**cc-switch**：支持 Claude Code、Codex、OpenCode、Gemini CLI **四合一** 切换与管理的跨平台桌面应用。目前已在 GitHub 获得 14.5K Star。

> 项目地址：[github.com/farion1231/…](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Ffarion1231%2Fcc-switch)

------

# 二、核心功能

cc-switch 不仅仅是一个配置文件管理工具，而是一套完整的多模型管理解决方案。

## 功能全景图

![cc-switch 主界面](https://p6-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/30d0af2f99054593aff31e3f574a8cdb~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361802&x-signature=pcz7TyglAzJhl4czXR%2BYihbYNUA%3D)

![cc-switch 界面展示](https://p6-xtjj-sign.byteimg.com/tos-cn-i-73owjymdk6/5edec6367a7540549c65bac069b740bf~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg5rCn54O3:q75.awebp?rk3s=f64ab15b&x-expires=1777361802&x-signature=Lhkqv%2BKn3h6lAZAe2JhJKbJXpcc%3D)

## 主要特性

| 功能模块                 | 说明                                                         |
| ------------------------ | ------------------------------------------------------------ |
| **多模型一键切换**       | 支持 Claude Code、Codex、OpenCode、Gemini CLI 四大主流编程 CLI，内置常用中转节点预设，也支持完全自定义（包括 Kimi、Moonshot、GLM 等国产模型） |
| **MCP 服务器统一管理**   | 支持 stdio/http/sse 三种传输方式，一键同步到所有客户端，无需分别修改每个工具的配置 |
| **Skills 一键安装/卸载** | 自动扫描 GitHub 热门 Claude Skills 仓库，支持批量安装和版本管理 |
| **多套系统 Prompt 管理** | Markdown 实时编辑与预览，支持为不同模型/场景配置专属提示词模板，一键应用 |
| **API 速度测试**         | 提供延迟可视化，清晰展示各节点的速度和稳定性                 |
| **配置安全备份**         | 自动保留最近 10 个版本，支持导入导出，防止误操作导致配置丢失 |
| **跨平台支持**           | Windows / macOS / Linux 全平台适配，提供系统托盘快速切换、开机自启、自动更新、单实例守护等桌面原生体验 |

**适用人群**：需要在 CLI 中灵活使用多模型、多中转服务，以及进行 Skills/Prompts 管理的开发者。

------

# 三、快速上手

## 步骤 1：下载安装

根据操作系统选择对应的安装包（推荐使用最新 Release 版本）：

| 操作系统 | 安装方式                                                     |
| -------- | ------------------------------------------------------------ |
| Windows  | MSI 安装包或便携版 ZIP                                       |
| macOS    | `brew install --cask cc-switch` 或下载 ZIP 解压              |
| Linux    | deb / rpm / AppImage / Flatpak，Arch 用户可使用 `paru -S cc-switch-bin` |

## 步骤 2：添加 Provider

首次启动后，界面清晰直观，点击 **Add Provider** 添加第一个配置。可直接选择预设的中转节点，或手动输入 API Key 和基地址。

## 步骤 3：启用 Provider

选择配置后点击 **Enable**，程序会自动写入对应 CLI 的配置文件（如 `~/.claude` / `~/.codex` 等）。

> 部分新版 CLI 已支持热切换，无需重启终端即可生效。

## 步骤 4：探索高级功能

- **MCP 页签** — 添加并同步自定义 MCP 服务器
- **Skills 页签** — 一键从 GitHub 安装热门技能
- **Prompts 页签** — 创建多套系统提示词模板
- **系统托盘** — 右键菜单随时快速切换模型

## 步骤 5：开始使用

在终端中使用开发工具，随时切换：

- Claude 4.6 Sonnet 快速预览
- Gemini 3.0 Flash 超快响应
- GPT-4o 深度推理
- DeepSeek Coder 高性价比

------

# 四、注意事项

1. **API Key 安全** — 请勿将 API Key 直接分享或在公开场所暴露
2. **代理设置** — 如需访问境外服务，请提前配置代理
3. **配置备份** — 重要配置变更前，建议手动导出备份