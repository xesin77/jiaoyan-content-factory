/**
 * 教研内容工场 Demo · 本地后端代理（零依赖，Node 18+ 直接运行）
 *
 * 作用：
 *   1. 托管本目录下的 Demo 页面（打开 http://localhost:3000 即是 Demo）
 *   2. /api/chat 把前端的对话请求转发到真实大模型（API Key 只存在服务端，不进浏览器）
 *
 * 使用方法：
 *   1. 复制 .env.example 为 .env，填入你的 API Key
 *   2. 在本目录运行：node server.js  （或 npm start）
 *   3. 浏览器打开 http://localhost:3000
 *
 * 部署（Render / Railway 等）：
 *   - 启动命令：node server.js  （package.json 已配置 npm start）
 *   - 平台会把监听端口写入环境变量 PORT，本服务自动读取
 *   - 务必在平台控制台设置环境变量 LLM_API_KEY / LLM_PROVIDER，不要把 .env 提交到仓库
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIR = __dirname;
const ENTRY = 'index.html';

/* ---------- 读取 .env（简单解析，不依赖 dotenv） ---------- */
function loadEnv() {
  const f = path.join(DIR, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

/* ---------- 服务商预设（与前端一致） ---------- */
const PRESETS = {
  deepseek: { name: 'DeepSeek', base: 'https://api.deepseek.com', model: 'deepseek-chat' },
  kimi:     { name: 'Kimi',     base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  glm:      { name: '智谱 GLM', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  qwen:     { name: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
};

function getConf() {
  const p = PRESETS[process.env.LLM_PROVIDER] || PRESETS.deepseek;
  return {
    name: p.name,
    key: process.env.LLM_API_KEY || '',
    base: (process.env.LLM_BASE || p.base).replace(/\/+$/, ''),
    model: process.env.LLM_MODEL || p.model,
  };
}

/* ---------- HTTP 服务 ---------- */
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  // 健康检查：前端据此判断是否启用代理模式
  if (url === '/api/health' && req.method === 'GET') {
    const c = getConf();
    return json(res, 200, { ok: true, configured: !!c.key, name: c.name, model: c.model });
  }

  // 对话代理：SSE 流式透传
  if (url === '/api/chat' && req.method === 'POST') {
    const conf = getConf();
    if (!conf.key) return json(res, 400, { error: { message: '服务端未配置 LLM_API_KEY（请检查 .env 或平台环境变量）' } });

    let body = '';
    req.on('data', c => (body += c));
    req.on('end', async () => {
      let messages;
      try {
        messages = JSON.parse(body).messages;
        if (!Array.isArray(messages)) throw new Error('bad messages');
      } catch {
        return json(res, 400, { error: { message: '请求格式错误：需要 { messages: [...] }' } });
      }

      let upstream;
      try {
        upstream = await fetch(conf.base + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + conf.key },
          body: JSON.stringify({ model: conf.model, messages, stream: true, max_tokens: 2500, temperature: 0.8 }),
        });
      } catch (e) {
        return json(res, 502, { error: { message: '无法连接模型服务商：' + e.message } });
      }

      if (!upstream.ok) {
        const text = await upstream.text();
        res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(text);
      }

      // 流式透传 SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      try {
        for await (const chunk of upstream.body) res.write(chunk);
      } catch (e) {
        console.error('上游流中断：', e.message);
      }
      res.end();
    });
    return;
  }

  // 静态文件：/ 和 /index.html 指向 Demo 入口，其余文件按需提供
  let file = url === '/' || url === '/index.html' ? ENTRY : decodeURIComponent(url.slice(1));
  const full = path.join(DIR, path.normalize(file));
  if (!full.startsWith(DIR) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    return json(res, 404, { error: { message: 'Not Found' } });
  }
  const ext = path.extname(full).toLowerCase();
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime + (mime.startsWith('text') || mime === 'application/json' ? '; charset=utf-8' : '') });
  fs.createReadStream(full).pipe(res);
});

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

server.listen(PORT, () => {
  const c = getConf();
  console.log('');
  console.log('  教研内容工场 Demo 已启动');
  console.log('  ----------------------------------------');
  console.log('  打开地址:  http://localhost:' + PORT);
  console.log('  模型配置:  ' + c.name + ' / ' + c.model);
  console.log('  API Key:   ' + (c.key ? '已配置 (' + c.key.slice(0, 6) + '...)' : '未配置！请设置 LLM_API_KEY'));
  console.log('  ----------------------------------------');
  console.log('  按 Ctrl+C 停止服务');
});
