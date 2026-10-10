// Vercel Serverless Function · 对话代理（SSE 流式透传）
// 前端 chatStreamProxy() POST /api/chat { messages: [...] }，响应格式与服务商 SSE 一致
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

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    response: 'stream',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method Not Allowed' } });
    return;
  }

  const conf = getConf();
  if (!conf.key) {
    res.status(400).json({ error: { message: '服务端未配置 LLM_API_KEY（请在 Vercel 环境变量中设置）' } });
    return;
  }

  const messages = req.body && req.body.messages;
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: { message: '请求格式错误：需要 { messages: [...] }' } });
    return;
  }

  let upstream;
  try {
    upstream = await fetch(conf.base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + conf.key },
      body: JSON.stringify({ model: conf.model, messages, stream: true, max_tokens: 2500, temperature: 0.8 }),
    });
  } catch (e) {
    res.status(502).json({ error: { message: '无法连接模型服务商：' + e.message } });
    return;
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(text);
    return;
  }

  // 流式透传 SSE（上游已经是标准的 data: ... 行）
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
}
