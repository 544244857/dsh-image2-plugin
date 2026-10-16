# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 0.3.0 — 2026-10-16

### 新增

- 内联媒体预览：安装时一并安装 [`@wisdoverse/dsh-inline-media-viewer`](https://github.com/Wisdoverse/dsh-inline-media-viewer-plugin) `1.0.12`（作为 `dependencies`，其自带 `dsh.bundle` patch 会被 profile 管理器自动启用）。生成的图片直接在对话中渲染，不再需要点开交付卡片。
- `package.json` 补齐 `repository` / `homepage` / `bugs` / `keywords` / `license` / `author`，便于在 npm 与社区目录中被检索。
- README 重写：徽章、社区插件标签、安装/配置/FAQ/兼容性说明。

### 说明

- 内联预览由上游维护；移除 `dependencies` 中的该行只会让预览消失，image2 功能不受影响。

## 0.2.0 — 2026-10-16

### 新增

- 图形化设置页：侧边栏 Plugins 页内的 `image2` 配置行（含遮蔽的 `apiKey` 密钥字段），保存写回当前 profile 的 Cordis patch。
- 输出目录越界保护、同名文件保留、取消与超时处理。
- 生成后要求用原生 `read_image` 做视觉自检。

## 0.1.0 — 2026-10-15

### 新增

- 首个版本：注册 `image2_generate` 工具，通过 OpenAI 兼容图片中转站的 `POST /images/generations` 完成文生图，结果保存到会话项目的 `outputDir`。
