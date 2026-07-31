const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ========== SECURITY ==========
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || '';
const rateMap = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60 * 1000;

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    entry = { start: now, count: 0 };
    rateMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

function requireGatewayAuth(req, res) {
  if (!GATEWAY_SECRET) return true;
  const token = req.headers['x-gateway-key'] || req.query.gatewayKey || (req.body && req.body.gatewayKey);
  if (token === GATEWAY_SECRET) return true;
  res.status(401).json({ error: 'Unauthorized. Send header x-gateway-key or query gatewayKey' });
  return false;
}

function safeLog(msg) {
  console.log(String(msg).replace(/sk-[a-zA-Z0-9_-]{10,}/g, 'sk-***').replace(/gsk_[a-zA-Z0-9_-]{10,}/g, 'gsk-***'));
}

// ========== 30 AI / USEFUL SERVICES ==========
const SERVICES = {
  groq: { name: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', keyEnv: 'GROQ_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://console.groq.com/keys' },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', keyEnv: 'OPENROUTER_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://openrouter.ai/keys' },
  gemini: { name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', keyEnv: 'GEMINI_KEY', keyQuery: 'key', keyLink: 'https://aistudio.google.com/apikey' },
  openai: { name: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', keyEnv: 'OPENAI_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://platform.openai.com/api-keys' },
  anthropic: { name: 'Anthropic Claude', url: 'https://api.anthropic.com/v1/messages', keyEnv: 'ANTHROPIC_KEY', keyHeader: 'x-api-key', keyPrefix: '', keyLink: 'https://console.anthropic.com/settings/keys' },
  huggingface: { name: 'Hugging Face', url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', keyEnv: 'HF_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://huggingface.co/settings/tokens' },
  together: { name: 'Together AI', url: 'https://api.together.xyz/v1/chat/completions', keyEnv: 'TOGETHER_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://api.together.xyz/settings/api-keys' },
  cohere: { name: 'Cohere', url: 'https://api.cohere.ai/v1/chat', keyEnv: 'COHERE_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://dashboard.cohere.com/api-keys' },
  mistral: { name: 'Mistral AI', url: 'https://api.mistral.ai/v1/chat/completions', keyEnv: 'MISTRAL_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://console.mistral.ai/api-keys' },
  deepseek: { name: 'DeepSeek', url: 'https://api.deepseek.com/chat/completions', keyEnv: 'DEEPSEEK_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://platform.deepseek.com/api_keys' },
  fireworks: { name: 'Fireworks AI', url: 'https://api.fireworks.ai/inference/v1/chat/completions', keyEnv: 'FIREWORKS_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://fireworks.ai/account/api-keys' },
  perplexity: { name: 'Perplexity', url: 'https://api.perplexity.ai/chat/completions', keyEnv: 'PERPLEXITY_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://www.perplexity.ai/settings/api' },
  xai: { name: 'xAI Grok', url: 'https://api.x.ai/v1/chat/completions', keyEnv: 'XAI_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://console.x.ai' },
  cerebras: { name: 'Cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', keyEnv: 'CEREBRAS_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://cloud.cerebras.ai' },
  sambanova: { name: 'SambaNova', url: 'https://api.sambanova.ai/v1/chat/completions', keyEnv: 'SAMBANOVA_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://cloud.sambanova.ai' },
  replicate: { name: 'Replicate', url: 'https://api.replicate.com/v1/predictions', keyEnv: 'REPLICATE_KEY', keyHeader: 'Authorization', keyPrefix: 'Token ', keyLink: 'https://replicate.com/account/api-tokens' },
  stability: { name: 'Stability AI', url: 'https://api.stability.ai/v2beta/stable-image/generate/core', keyEnv: 'STABILITY_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://platform.stability.ai/account/keys' },
  elevenlabs: { name: 'ElevenLabs', url: 'https://api.elevenlabs.io/v1/text-to-speech', keyEnv: 'ELEVENLABS_KEY', keyHeader: 'xi-api-key', keyPrefix: '', keyLink: 'https://elevenlabs.io/app/settings/api-keys' },
  assemblyai: { name: 'AssemblyAI', url: 'https://api.assemblyai.com/v2/transcript', keyEnv: 'ASSEMBLYAI_KEY', keyHeader: 'authorization', keyPrefix: '', keyLink: 'https://www.assemblyai.com/app/account' },
  deepgram: { name: 'Deepgram', url: 'https://api.deepgram.com/v1/listen', keyEnv: 'DEEPGRAM_KEY', keyHeader: 'Authorization', keyPrefix: 'Token ', keyLink: 'https://console.deepgram.com' },
  pinecone: { name: 'Pinecone', url: 'https://api.pinecone.io', keyEnv: 'PINECONE_KEY', keyHeader: 'Api-Key', keyPrefix: '', keyLink: 'https://app.pinecone.io' },
  supabase: { name: 'Supabase', url: 'https://api.supabase.com', keyEnv: 'SUPABASE_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://supabase.com/dashboard/account/tokens' },
  cloudflare: { name: 'Cloudflare AI', url: 'https://api.cloudflare.com/client/v4/accounts', keyEnv: 'CLOUDFLARE_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://dash.cloudflare.com/profile/api-tokens' },
  serper: { name: 'Serper (Google Search)', url: 'https://google.serper.dev/search', keyEnv: 'SERPER_KEY', keyHeader: 'X-API-KEY', keyPrefix: '', keyLink: 'https://serper.dev/api-key' },
  tavily: { name: 'Tavily Search', url: 'https://api.tavily.com/search', keyEnv: 'TAVILY_KEY', keyHeader: 'Authorization', keyPrefix: 'Bearer ', keyLink: 'https://tavily.com' },
  weather: { name: 'Open-Meteo Weather', url: 'https://api.open-meteo.com/v1/forecast', keyEnv: null, keyLink: null },
  newsapi: { name: 'NewsAPI', url: 'https://newsapi.org/v2/top-headlines', keyEnv: 'NEWSAPI_KEY', keyQuery: 'apiKey', keyLink: 'https://newsapi.org/account' },
  removebg: { name: 'Remove.bg', url: 'https://api.remove.bg/v1.0/removebg', keyEnv: 'REMOVEBG_KEY', keyHeader: 'X-Api-Key', keyPrefix: '', keyLink: 'https://www.remove.bg/dashboard#api-key' },
  jsonplaceholder: { name: 'JSONPlaceholder (test)', url: 'https://jsonplaceholder.typicode.com/posts', keyEnv: null, keyLink: null },
  catfact: { name: 'Cat Facts (test)', url: 'https://catfact.ninja/fact', keyEnv: null, keyLink: null }
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Hey Nova API Gateway',
    security: GATEWAY_SECRET ? 'gateway_secret_enabled' : 'open_personal_mode',
    singleUrl: '/api/gateway',
    services: Object.keys(SERVICES).length
  });
});

app.get('/api/services', (req, res) => {
  res.json({
    gateway: '/api/gateway',
    count: Object.keys(SERVICES).length,
    services: Object.entries(SERVICES).map(([id, s]) => ({
      id,
      name: s.name,
      keyLink: s.keyLink || null,
      hasEnvKey: s.keyEnv ? !!process.env[s.keyEnv] : false
    }))
  });
});

// ========== SINGLE GATEWAY URL ==========
app.all('/api/gateway', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max ' + RATE_LIMIT + ' requests/minute.' });
  }
  if (!requireGatewayAuth(req, res)) return;

  try {
    const body = req.body || {};
    const serviceId = (body.service || req.query.service || '').toLowerCase().trim();
    let targetUrl = body.url || req.query.url || null;
    let apiKey = body.apiKey || req.headers['x-api-key'] || null;

    if (!targetUrl && serviceId && SERVICES[serviceId]) {
      targetUrl = SERVICES[serviceId].url;
      if (!apiKey && SERVICES[serviceId].keyEnv && process.env[SERVICES[serviceId].keyEnv]) {
        apiKey = process.env[SERVICES[serviceId].keyEnv];
      }
    }

    if (!targetUrl) {
      return res.status(400).json({
        error: 'Provide "service" (e.g. groq) or "url"',
        available_services: Object.keys(SERVICES)
      });
    }

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid target URL' });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only http/https allowed' });
    }

    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.')) {
      return res.status(403).json({ error: 'Internal/private URLs blocked for security' });
    }

    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const svc = SERVICES[serviceId];

    if (apiKey) {
      if (svc && svc.keyQuery) {
        parsed.searchParams.set(svc.keyQuery, apiKey);
      } else if (svc && svc.keyHeader) {
        headers[svc.keyHeader] = (svc.keyPrefix || '') + apiKey;
      } else {
        headers['Authorization'] = 'Bearer ' + apiKey;
      }
    }

    if (serviceId === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
    }

    const method = body.method || req.method || 'POST';
    const payload = body.payload !== undefined ? body.payload : (method === 'GET' || method === 'HEAD' ? undefined : body);

    let finalBody;
    if (payload && method !== 'GET' && method !== 'HEAD') {
      if (typeof payload === 'object' && !Array.isArray(payload)) {
        const clean = { ...payload };
        delete clean.service;
        delete clean.url;
        delete clean.apiKey;
        delete clean.method;
        delete clean.payload;
        delete clean.gatewayKey;
        finalBody = JSON.stringify(clean);
      } else {
        finalBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
      }
    }

    safeLog('Gateway → ' + (serviceId || 'custom') + ' ' + parsed.hostname);

    const upstream = await fetch(parsed.toString(), {
      method,
      headers,
      body: finalBody,
      redirect: 'follow'
    });

    const data = await upstream.arrayBuffer();
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      const lower = k.toLowerCase();
      if (!['content-encoding', 'transfer-encoding', 'content-length', 'connection'].includes(lower)) {
        res.setHeader(k, v);
      }
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(data));
  } catch (err) {
    safeLog('Gateway error: ' + err.message);
    res.status(502).json({ error: 'Gateway request failed', details: err.message });
  }
});

// Vercel serverless export
module.exports = app;

// Local run
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('Hey Nova Gateway running on :' + PORT));
}
