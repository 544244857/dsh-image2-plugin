# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 0.4.0 — 2026-10-17

### 新增

- **图生图（参考图引导生成）**：`image2_generate` 新增 `image` 参数，传本地参考图路径即改走 `POST /images/edits`（`multipart/form-data` 上传），不传仍是文生图 `POST /images/generations`。
- 新增 `aspectRatio` 参数（以 `aspect_ratio` 字段发出），给只认宽高比、忽略 `size` 的中转站用。
- 新增 `responseFormat` 配置项（默认 `b64_json`）：设 `url` 让插件下载中转站返回的链接，设为空字符串则完全不发该字段。
- 参考图在发出请求前完成校验：按魔术字节判定 PNG/JPEG/WebP，限制 20 MB；路径不存在、非普通文件、格式不支持均提前报错，不消耗额度。

### 修复

- 中转站返回自家 CDN 临时链接且本机连不上该域名时（`ConnectTimeoutError: attempted address: imgen.x.ai:443`），可用 `responseFormat: b64_json` 让图片字节内联回传。

### 测试

- `test/smoke.js` 扩到 13 项，新增 multipart 上传、魔术字节校验、`responseFormat` 两条通道三个用例；测试断言从 `images/generations` 放宽到按模式匹配端点。
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
