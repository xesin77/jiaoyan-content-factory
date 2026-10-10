# 教研内容工场 Demo

一个单文件前端（AI 对话 Demo）+ 服务端代理的作品集项目。
后端把大模型 API Key 留在服务端（Vercel 环境变量），访客**无需自己填 Key** 即可对话。

部署形态：**Vercel 原生** —— `index.html` 由 Vercel 静态托管，`api/` 下的文件是 Vercel Serverless 函数。
没有 `server.js`、没有常驻 Node 服务，因此**任何设备、任何浏览器打开域名都能正常访问**。

---

## 目录结构（最终版，干净可推）

```
index.html        # 前端 Demo（单文件，内联 CSS/JS），Vercel 静态托管
api/
  health.js       # Serverless：健康检查，前端据此启用代理模式
  chat.js         # Serverless：/api/chat 代理转发 + SSE 流式输出
package.json      # 仅元数据 + Node 版本要求（无 start 脚本，避免 Vercel 误判）
vercel.json       # 关闭构建/安装，根目录直接托管
.env.example      # 环境变量模板（仅作参考，真实 Key 放 Vercel）
.gitignore        # 排除 .env，防止密钥泄露
README.md         # 本文件
```

> ✅ **没有任何 `server.js`**，Vercel 不会把它误判成 Node 常驻服务（这正是之前首页 404 的根因）。

---

## 第一步：推到 GitHub

在本仓库目录执行（把 `<你的用户名>` 换成实际账号）：

```bash
git remote add origin https://github.com/<你的用户名>/jiaoyan-content-factory.git
git branch -M main
git push -u origin main
```

（如果仓库已存在，先 `git remote -v` 确认；若是旧仓库，用 `git push --force` 覆盖。）

---

## 第二步：Vercel 部署（主平台）

1. 打开 [vercel.com](https://vercel.com) → **Add New → Project** → 导入上面的 GitHub 仓库。
2. 项目配置（关键，照抄即可）：
   - **Framework Preset：** `Other`
   - **Build Command：** 留空
   - **Install Command：** 留空
   - **Output Directory：** `.`（根目录）
3. 先点 **Deploy**（先不配 Key 也能部署成功，首页照样能打开）。
4. 部署完成后，进入项目 → **Settings → Environment Variables**，添加两条：
   - `LLM_PROVIDER` = `deepseek`（可选 `kimi` / `glm` / `qwen`）
   - `LLM_API_KEY` = 你的真实 Key（如 `sk-...`）
5. 加完变量后，**必须再 Deploy 一次**（环境变量变更要重新部署才生效）。

**测试：**
- 访问分配的 `*.vercel.app` 地址，首页应正常打开。
- 访问 `/api/health` 应返回 `{"ok":true,"configured":true,...}`（true 表示代理已生效，访客免填 Key）。
- 若 `configured:false`：说明环境变量没设对，回去第 4 步检查。
- 若 `/api/health` 仍 404：说明 Vercel 仍把项目当 Node 服务——确认仓库里**没有 `server.js`** 且 `package.json` 没有 `start` 脚本，然后 Redeploy。

---

## 第三步：换成你自己的域名（腾讯云）

> 前提：你已在腾讯云（DNSPod）有一个域名，且能管理它的解析记录。

1. **Vercel 侧添加域名：**
   - 项目 → **Settings → Domains** → 输入你的域名（例如 `jiaoyan.你的域名.com` 或 `www.你的域名.com`）。
   - Vercel 会给你一条 **CNAME 记录值**（通常是 `cname.vercel-dns.com`）。
2. **腾讯云侧添加解析：**
   - 登录腾讯云 → **DNS 解析 DNSPod** → 找到你的域名 → **添加记录**：
     - 记录类型：`CNAME`
     - 主机记录：填子域名前缀（如 `jiaoyan` 或 `www`）
     - 记录值：`cname.vercel-dns.com`（以 Vercel 页面显示为准）
   - 保存。
3. **等待生效：**
   - 几分钟到几十分钟（DNS 传播）。Vercel 的 Domains 页面会从 `Invalid Configuration` 变成 `Valid Configuration`，并**自动签发 SSL 证书**。
4. 之后用你的域名访问即可，体验和 `*.vercel.app` 完全一致。

---

## 安全说明

- `.env` 已被 `.gitignore` 排除，**永远不会进仓库**。
- 真实 Key 只存在于：Vercel 的 Environment Variables（线上）或你本机的 `.env`（仅本地测试用，本仓库不含 `.env`）。
- 前端「直连模式」（访客自己填 Key、存 localStorage）在后端未配置时**自动启用**——所以即使你忘配 Key，网站也能打开，只是访客要自己贴 Key。两种模式互不影响，网站永不中断。
