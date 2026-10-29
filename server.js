// Stash server: serves the static page and proxies AI image generation to OpenRouter.
// No dependencies; needs Node 18+ (global fetch).
//
// Environment variables:
//   PORT                 port to listen on (default 8080)
//   OPENROUTER_API_KEY   enables AI generation; never sent to the browser
//   OPENROUTER_MODEL     image model (default google/gemini-nano-banana-2.1)
//   GEN_DAILY_LIMIT      max images per day for the whole site (default 150)
//   GEN_IP_LIMIT         max images per day per visitor IP (default 40)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-nano-banana-2.1';
const DAILY = Number(process.env.GEN_DAILY_LIMIT) || 150;
const PER_IP = Number(process.env.GEN_IP_LIMIT) || 40;
const TYPES = {'.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon'};
const PUBLIC = new Set(['/index.html']);

// --- daily limits (in memory; reset at UTC midnight or on restart) ---
let day = '', total = 0, perIp = new Map();
function quota(ip){
  const today = new Date().toISOString().slice(0, 10);
  if(today !== day){ day = today; total = 0; perIp = new Map(); }
  return Math.max(0, Math.min(DAILY - total, PER_IP - (perIp.get(ip) || 0)));
}
function spend(ip){ total++; perIp.set(ip, (perIp.get(ip) || 0) + 1); }
function refund(ip){ total = Math.max(0, total - 1); perIp.set(ip, Math.max(0, (perIp.get(ip) || 1) - 1)); }
const clientIp = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

function send(res, code, obj){ res.writeHead(code, {'Content-Type':'application/json', 'Cache-Control':'no-store'}); res.end(JSON.stringify(obj)); }
function readJson(req, max){
  return new Promise((ok, bad) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if(size > max){ bad(new Error('Request too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try{ ok(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }catch(e){ bad(new Error('Bad JSON')); } });
    req.on('error', bad);
  });
}

async function openrouter(prompt, images){
  const headers = {'Authorization':'Bearer ' + KEY, 'Content-Type':'application/json', 'X-Title':'Stash NFT'};
  // 1) Image API
  const body = {model:MODEL, prompt, aspect_ratio:'1:1', resolution:'1K'};
  if(images.length) body.input_references = images.map(url => ({type:'image_url', image_url:{url}}));
  let r = await fetch('https://openrouter.ai/api/v1/images', {method:'POST', headers, body:JSON.stringify(body)});
  let j = await r.json().catch(() => ({}));
  if(r.ok && j.data && j.data[0] && j.data[0].b64_json) return `data:${j.data[0].media_type || 'image/png'};base64,${j.data[0].b64_json}`;
  // 2) Fallback: chat completions with image output
  const content = [{type:'text', text:prompt}];
  images.forEach(url => content.push({type:'image_url', image_url:{url}}));
  r = await fetch('https://openrouter.ai/api/v1/chat/completions', {method:'POST', headers, body:JSON.stringify({model:MODEL, messages:[{role:'user', content}], modalities:['image','text']})});
  j = await r.json().catch(() => ({}));
  const img = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.images && j.choices[0].message.images[0];
  if(r.ok && img && img.image_url && img.image_url.url) return img.image_url.url;
  throw new Error((j.error && (j.error.message || j.error)) || ('OpenRouter HTTP ' + r.status));
}

async function api(req, res, p){
  const ip = clientIp(req);
  if(p === '/api/ai/status') return send(res, 200, {enabled:!!KEY, model:MODEL, left: KEY ? quota(ip) : 0});
  if(p === '/api/ai/image' && req.method === 'POST'){
    if(!KEY) return send(res, 503, {error:'AI generation is not configured'});
    if(quota(ip) <= 0) return send(res, 429, {error:'Daily generation limit reached'});
    let b; try{ b = await readJson(req, 12 * 1024 * 1024); }catch(e){ return send(res, 400, {error:e.message}); }
    const prompt = String(b.prompt || '').slice(0, 1200).trim();
    const isImg = x => typeof x === 'string' && x.startsWith('data:image/');
    const images = [].concat(b.images || [], b.image || []).filter(isImg).slice(0, 4);
    if(!prompt) return send(res, 400, {error:'Empty prompt'});
    spend(ip);
    try{ const out = await openrouter(prompt, images); return send(res, 200, {image:out, left:quota(ip)}); }
    catch(e){ refund(ip); console.error('AI error:', e.message); return send(res, 502, {error:String(e.message).slice(0, 300), left:quota(ip)}); }
  }
  return send(res, 404, {error:'Not found'});
}

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if(p.startsWith('/api/')) return api(req, res, p).catch(e => send(res, 500, {error:'Server error'}));
  if(p === '/' || !path.extname(p)) p = '/index.html';
  if(!PUBLIC.has(p)){ res.writeHead(404, {'Content-Type':'text/plain'}); return res.end('Not found'); }
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if(err){ res.writeHead(404, {'Content-Type':'text/plain'}); return res.end('Not found'); }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => console.log(`Stash is running on port ${PORT}. AI generation: ${KEY ? 'on (' + MODEL + ')' : 'off (set OPENROUTER_API_KEY)'}`));
