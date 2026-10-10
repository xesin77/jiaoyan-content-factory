# 教研内容工场 Demo

单文件前端（AI 对话 demo）+ 零依赖 Node 后端代理。后端把大模型 API Key 留在服务端，访客无需自己填 Key 即可对话。

## 目录结构

```
index.html        # 前端 Demo（单文件，内联 CSS/JS）
server.js         # Node 后端：托管页面 + /api/chat 代理转发
package.json      # 启动脚本 + Node 版本要求（>=18）
.env.example      # 环境变量模板（复制为 .env 后填入 Key）
.gitignore        # 排除 .env，防止密钥泄露
```

## 本地运行

```bash
cp .env.example .env      # 然后编辑 .env，填入 LLM_API_KEY
npm start                 # 或 node server.js
# 浏览器打开 http://localhost:3000
```

## 部署到 Render（推荐，免费额度够用）

1. 把本仓库推到 GitHub。
2. 打开 [render.com](https://render.com) → New → Web Service → 关联该 GitHub 仓库。
3. 配置：
   - **Runtime:** Node
   - **Build Command:** 留空（无依赖）
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. 在 **Environment** 里添加变量（不要写进仓库）：
   - `LLM_PROVIDER` = `deepseek`（或 kimi / glm / qwen）
   - `LLM_API_KEY` = 你的真实 Key
5. 部署完成后，Render 分配的 `https://xxx.onrender.com` 即是线上地址，访客直接对话。

> 免费版 Render 在闲置后会休眠，首次访问可能慢几秒，属正常现象。

## 部署到 Railway

1. 推到 GitHub 后，[railway.app](https://railway.app) → New Project → Deploy from GitHub repo。
2. 自动识别 Node 项目，`npm start` 启动。
3. 在 Variables 里加 `LLM_PROVIDER` 和 `LLM_API_KEY`。

## 安全说明

- `.env` 已被 `.gitignore` 排除，**永远不会进仓库**。
- 真实 Key 只存在于：你本机的 `.env` 或托管平台的环境变量。
- 前端「直连模式」（访客自己填 Key、存 localStorage）在后端未配置时自动启用，两种模式互不影响。
