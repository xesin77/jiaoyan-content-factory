# 教研内容工场 Demo

单文件前端（AI 对话 demo）+ 服务端代理。后端把大模型 API Key 留在服务端（Vercel 环境变量），访客无需自己填 Key 即可对话。

> 架构说明：本项目为 **Vercel 原生形态**——`index.html` 由 Vercel 静态托管，`/api/chat`、`/api/health` 是 Vercel Serverless 函数。
> 不再使用 `server.listen()` 常驻服务（那套只适合 Render/Railway，在 Vercel 上会导致首页 404）。

## 目录结构

```
index.html        # 前端 Demo（单文件，内联 CSS/JS），Vercel 静态托管
api/health.js     # Serverless：健康检查，前端据此启用代理模式
api/chat.js       # Serverless：/api/chat 代理转发 + SSE 流式输出
server.js         # 仅本地开发用（npm run dev），线上不使用
package.json      # dev 脚本 + Node 版本要求（>=18）
vercel.json       # 关闭构建/安装，根目录直接托管
.env.example      # 环境变量模板（Vercel 环境变量参考）
.gitignore        # 排除 .env，防止密钥泄露
```

## 本地运行（可选）

```bash
cp .env.example .env      # 编辑 .env，填入 LLM_API_KEY
npm run dev               # 启动 server.js，打开 http://localhost:3000
```

## 部署到 Vercel（本项目目标平台）

1. 把本仓库推到 GitHub（或直接在 Vercel 导入该仓库）。
2. 在 Vercel 导入仓库，项目设置：
   - **Framework Preset:** Other（或留空）
   - **Build Command:** 留空（vercel.json 已设为 null）
   - **Install Command:** 留空
   - **Output Directory:** `.`（根目录）
3. 在 **Environment Variables** 里添加（**不要写进仓库**）：
   - `LLM_PROVIDER` = `deepseek`（或 kimi / glm / qwen）
   - `LLM_API_KEY` = 你的真实 Key
4. Deploy。Vercel 自动分配 `*.vercel.app` 地址，并构建 `api/` 下的函数。
5. 绑定自定义域名（如 `jiaoyan-content-factory.kira7.ltd`）：
   - 在 Vercel 项目 → Settings → Domains 添加该域名。
   - 按提示在 DNS 处加 CNAME 指向 `cname.vercel-dns.com`（或 Vercel 给你的记录）。
   - 等待 SSL 自动签发（通常几分钟）。

> 若之前用 `server.listen()` 版本部署过，请确认本项目里 **package.json 没有 `start` 脚本**，否则 Vercel 会误判为 Node 常驻服务而再次 404。

## 安全说明

- `.env` 已被 `.gitignore` 排除，**永远不会进仓库**。
- 真实 Key 只存在于：你本机的 `.env` 或 Vercel 的环境变量。
- 前端「直连模式」（访客自己填 Key、存 localStorage）在后端未配置时自动启用，两种模式互不影响。
