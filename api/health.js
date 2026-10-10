// Vercel Serverless Function · 健康检查
// 前端 detectProxy() 调用 /api/health，据此判断是否启用后端代理模式
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

export default async function handler(req, res) {
  const c = getConf();
  res.status(200).json({ ok: true, configured: !!c.key, name: c.name, model: c.model });
}
