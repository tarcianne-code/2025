/**
 * server.js — Plataforma de Histórias (single file)
 * Run: node server.js
 *
 * Requisitos: npm install express better-sqlite3 bcrypt jsonwebtoken socket.io cors body-parser
 *
 * Funcionalidades:
 * - SQLite persistente (data.db)
 * - Auth (register/login) com bcrypt + JWT
 * - CRUD de stories (publicação, listagem, remoção)
 * - Favoritos (toggle)
 * - Simulação de checkout (pagamento)
 * - Chat em tempo real (Socket.IO)
 * - Frontend integrado (index, login, editor, chat, admin)
 *
 * Observações:
 * - Uso educacional / protótipo. Não expor em produção sem revisar segurança.
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { Server as IOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'troca_essa_chave_ja';
const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, 'data.db');

const db = new Database(DB_PATH);

// --- DB init ---
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT,
  name TEXT,
  username TEXT UNIQUE,
  role TEXT DEFAULT 'user',
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  authorId TEXT,
  title TEXT,
  excerpt TEXT,
  body TEXT,
  tags TEXT, -- json array
  type TEXT,
  price REAL,
  likes INTEGER DEFAULT 0,
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  userId TEXT,
  storyId TEXT,
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT,
  senderId TEXT,
  content TEXT,
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  authorId TEXT,
  message TEXT,
  pinned INTEGER DEFAULT 0,
  createdAt INTEGER
);
`);

// helper util
const uid = (p=Date.now()) => `${p.toString(36)}${Math.random().toString(36).slice(2,9)}`;
const now = ()=>Math.floor(Date.now()/1000);

// --- auth helpers ---
async function hashPassword(p){ return await bcrypt.hash(p, 10); }
async function comparePassword(p,h){ return await bcrypt.compare(p,h); }
function signToken(user){ return jwt.sign({sub:user.id,role:user.role}, JWT_SECRET, {expiresIn:'12h'}); }
function verifyToken(token){ try{ return jwt.verify(token, JWT_SECRET); }catch(e){ return null; } }

function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'no token'});
  const token = auth.replace('Bearer ','');
  const data = verifyToken(token);
  if(!data) return res.status(401).json({error:'invalid token'});
  const stmt = db.prepare('SELECT id,email,name,username,role FROM users WHERE id = ?');
  const user = stmt.get(data.sub);
  if(!user) return res.status(401).json({error:'user not found'});
  req.user = user;
  next();
}

// --- API routes ---

// Register
app.post('/api/auth/register', async (req,res)=>{
  const {email,password,name,username} = req.body || {};
  if(!email || !password) return res.status(400).json({error:'missing email or password'});
  try{
    const hash = await hashPassword(password);
    const id = uid();
    const createdAt = now();
    const stmt = db.prepare('INSERT INTO users (id,email,password,name,username,createdAt) VALUES (?,?,?,?,?,?)');
    stmt.run(id,email,hash,name||null,username||null,createdAt);
    const user = {id,email,name,username,role:'user'};
    const token = signToken(user);
    return res.json({token, user});
  }catch(e){
    if(e.message && e.message.includes('UNIQUE')) return res.status(400).json({error:'email or username exists'});
    console.error(e);
    return res.status(500).json({error:'server error'});
  }
});

// Login
app.post('/api/auth/login', async (req,res)=>{
  const {email,password} = req.body || {};
  if(!email || !password) return res.status(400).json({error:'missing'});
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if(!row) return res.status(401).json({error:'invalid'});
  const ok = await comparePassword(password,row.password);
  if(!ok) return res.status(401).json({error:'invalid'});
  const user = {id:row.id,email:row.email,name:row.name,username:row.username,role:row.role};
  const token = signToken(user);
  res.json({token,user});
});

// GET me
app.get('/api/me', authMiddleware, (req,res)=>{
  res.json({user:req.user});
});

// Create story
app.post('/api/stories', authMiddleware, (req,res)=>{
  const {title,excerpt,body,tags,type,price} = req.body || {};
  if(!title || !body) return res.status(400).json({error:'missing title/body'});
  const id = uid();
  const createdAt = now();
  const stmt = db.prepare('INSERT INTO stories (id,authorId,title,excerpt,body,tags,type,price,createdAt) VALUES (?,?,?,?,?,?,?,?,?)');
  stmt.run(id, req.user.id, title, excerpt||'', body, JSON.stringify(tags||[]), type||'leia', price||null, createdAt);
  const s = db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
  res.json(s);
});

// List stories (search q)
app.get('/api/stories', (req,res)=>{
  const q = (req.query.q||'').trim();
  let rows;
  if(q){
    const pat = `%${q}%`;
    rows = db.prepare(`SELECT * FROM stories WHERE title LIKE ? OR excerpt LIKE ? OR body LIKE ? ORDER BY createdAt DESC`).all(pat,pat,pat);
  }else{
    rows = db.prepare('SELECT * FROM stories ORDER BY createdAt DESC').all();
  }
  // parse tags
  rows = rows.map(r => ({...r, tags: JSON.parse(r.tags||'[]')}));
  res.json(rows);
});

// Get single story
app.get('/api/stories/:id', (req,res)=>{
  const s = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if(!s) return res.status(404).json({error:'not found'});
  s.tags = JSON.parse(s.tags||'[]');
  res.json(s);
});

// Delete story (owner or admin)
app.delete('/api/stories/:id', authMiddleware, (req,res)=>{
  const s = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if(!s) return res.status(404).json({error:'not found'});
  if(s.authorId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({error:'not allowed'});
  db.prepare('DELETE FROM stories WHERE id = ?').run(req.params.id);
  res.json({ok:true});
});

// Toggle favorite
app.post('/api/stories/:id/favorite', authMiddleware, (req,res)=>{
  const storyId = req.params.id;
  const existing = db.prepare('SELECT * FROM favorites WHERE userId = ? AND storyId = ?').get(req.user.id, storyId);
  if(existing){
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    return res.json({ok:true,action:'removed'});
  }else{
    const id = uid();
    db.prepare('INSERT INTO favorites (id,userId,storyId,createdAt) VALUES (?,?,?,?)').run(id, req.user.id, storyId, now());
    return res.json({ok:true,action:'added'});
  }
});

// Simulated checkout
app.post('/api/checkout', authMiddleware, (req,res)=>{
  const { storyId } = req.body || {};
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(storyId);
  if(!story) return res.status(404).json({error:'story not found'});
  if(!story.price) return res.status(400).json({error:'not for sale'});
  // simulate payment link
  const fake = { url: `https://pagamento-simulado.local/checkout/${uid()}`, amount: story.price, storyId };
  return res.json({checkout:fake});
});

// Announcements (admin)
app.post('/api/admin/announce', authMiddleware, (req,res)=>{
  if(req.user.role !== 'admin') return res.status(403).json({error:'not allowed'});
  const {message, pinned} = req.body || {};
  const id = uid();
  db.prepare('INSERT INTO announcements (id,authorId,message,pinned,createdAt) VALUES (?,?,?,?,?)').run(id, req.user.id, message, pinned?1:0, now());
  res.json({ok:true});
});

app.get('/api/announcements', (req,res)=>{
  const rows = db.prepare('SELECT * FROM announcements ORDER BY pinned DESC, createdAt DESC').all();
  res.json(rows);
});

// create admin quick route if no admin exists (one-off, remove later)
app.get('/setup-admin', async (req,res)=>{
  const existing = db.prepare("SELECT * FROM users WHERE role='admin' LIMIT 1").get();
  if(existing) return res.send('admin exists. delete data.db to recreate or remove this route');
  const email = 'admin@local';
  const pwd = 'admin123';
  const hash = await hashPassword(pwd);
  const id = uid();
  db.prepare('INSERT INTO users (id,email,password,name,username,role,createdAt) VALUES (?,?,?,?,?,?,?)').run(id,email,hash,'Admin','admin','admin',now());
  return res.send(`admin created: ${email} / ${pwd}`);
});

// serve frontend pages (simple)
app.get('/', (req,res)=>{
  res.send(indexHTML());
});
app.get('/login', (req,res)=>res.send(loginHTML()));
app.get('/editor', (req,res)=>res.send(editorHTML()));
app.get('/chat', (req,res)=>res.send(chatHTML()));
app.get('/admin', (req,res)=>res.send(adminHTML()));

// Serve static assets (none external) - but allow for /favicon
app.get('/favicon.ico', (req,res)=>res.status(204).end());

// --- Socket.IO chat ---
io.on('connection', socket=>{
  console.log('socket connected', socket.id);
  socket.on('join', ({conversationId})=>{
    if(!conversationId) conversationId = 'public';
    socket.join(conversationId);
  });
  socket.on('message', ({conversationId, senderId, content})=>{
    if(!conversationId) conversationId = 'public';
    const id = uid();
    const createdAt = now();
    db.prepare('INSERT INTO messages (id,conversationId,senderId,content,createdAt) VALUES (?,?,?,?,?)').run(id, conversationId, senderId||'anon', content, createdAt);
    io.to(conversationId).emit('message', {id,conversationId,senderId,content,createdAt});
  });
});

// start
server.listen(PORT, ()=>console.log(`Server rodando em http://localhost:${PORT}`));

/* ===========================
   FRONTEND TEMPLATES (strings)
   =========================== */

function indexHTML(){
  return `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Histórias — Home</title>
<style>
:root{--bg:#071022;--card:#0b1220;--accent:#7c3aed;--muted:#9aa4b2;color:#e6eef6}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,Arial;background:var(--bg);color:var(--text,#e6eef6)}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;background:linear-gradient(180deg,#061224,#071526);padding:1rem}
.sidebar .logo{font-weight:700;background:linear-gradient(90deg,var(--accent),#06b6d4);width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center}
.sidebar nav{margin-top:1rem;display:flex;flex-direction:column;gap:.5rem}
.sidebar a{color:var(--muted);text-decoration:none;padding:.4rem .5rem;border-radius:6px}
.main{margin-left:240px;padding:1rem}
.top{display:flex;justify-content:space-between;align-items:center}
.search input{padding:.5rem;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit}
.feed{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;margin-top:1rem}
.card{background:var(--card);padding:1rem;border-radius:10px;border:1px solid rgba(255,255,255,0.03)}
button{background:var(--accent);color:#fff;border:0;padding:.4rem .6rem;border-radius:8px;cursor:pointer}
.pill{padding:.2rem .5rem;border-radius:999px;background:rgba(255,255,255,0.03);font-size:.85rem}
.header-actions{display:flex;gap:.5rem}
.ann{background:#081827;padding:.5rem;border-radius:8px;border:1px solid rgba(255,255,255,0.02);color:var(--muted)}
</style>
</head>
<body>
  <aside class="sidebar">
    <div class="logo">HS</div>
    <nav>
      <a href="/">Explorar</a>
      <a href="/editor">Criar</a>
      <a href="/chat">Chat</a>
      <a href="/admin">Admin</a>
      <a href="/login">Login</a>
    </nav>
  </aside>

  <main class="main">
    <header class="top">
      <div style="display:flex;gap:.5rem;align-items:center">
        <div class="search">
          <input id="search" placeholder="Pesquisar histórias..."/>
          <button id="btnSearch">Buscar</button>
        </div>
        <div class="header-actions">
          <button id="btnMy">Meu Perfil</button>
        </div>
      </div>
      <div id="annWrap"></div>
    </header>

    <section class="feed" id="feed"></section>
  </main>

<script>
const API = '/api';
function esc(s=''){ return String(s).replace(/[&<>\"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":\"&#39;\"}[m])); }
async function api(path, opts={}){
  opts.headers = {...(opts.headers||{}), 'content-type':'application/json'};
  const token = localStorage.getItem('token'); if(token) opts.headers.authorization = 'Bearer '+token;
  if(opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
  const r = await fetch(API + path, opts); return r.json();
}
async function renderFeed(q=''){
  const rows = await api('/stories?q=' + encodeURIComponent(q||''));
  const feed = document.getElementById('feed'); feed.innerHTML = '';
  rows.forEach(s=>{
    const card = document.createElement('div'); card.className='card';
    const tags = (s.tags && s.tags.length)? s.tags.join(', ') : '';
    card.innerHTML = '<h3>'+esc(s.title)+'</h3><div style="color:var(--muted)">por '+esc(s.authorId || 'anon')+'</div><p>'+esc(s.excerpt||'')+'</p><div style="display:flex;gap:.5rem"><button data-id="'+s.id+'" class="open">Abrir</button><button data-id="'+s.id+'" class="fav">Favoritar</button></div><div style="margin-top:.5rem;color:var(--muted)"><span class="pill">'+esc(s.type)+'</span> '+(tags?'<span class="pill">'+esc(tags)+'</span>':'')+(s.price?'<strong style=\"margin-left:.5rem\">R$ '+Number(s.price).toFixed(2)+'</strong>':'')+'</div>';
    feed.appendChild(card);
  });
}
window.addEventListener('load', ()=>{
  renderFeed();
  document.getElementById('btnSearch').onclick = ()=> renderFeed(document.getElementById('search').value);
  document.body.addEventListener('click', async (e)=>{
    if(e.target.classList.contains('open')){
      const id = e.target.dataset.id; const s = await api('/stories/'+id);
      alert('Título: '+s.title + '\\n\\n' + (s.body||s.excerpt||''));
    }
    if(e.target.classList.contains('fav')){
      const id = e.target.dataset.id; const res = await api('/stories/'+id+'/favorite',{method:'POST'}); alert('feito');
    }
  });

  // announcements
  api('/announcements').then(a=>{
    const wrap = document.getElementById('annWrap');
    if(a && a.length){
      wrap.innerHTML = '<div class="ann">'+ a.map(x=> '<div>'+esc(x.message)+'</div>').join('') +'</div>';
    }
  });
});
</script>
</body>
</html>`;
}

function loginHTML(){
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Login</title><style>
  body{display:grid;place-items:center;height:100vh;margin:0;background:#071022;color:#e6eef6;font-family:Inter,Arial} .card{background:#0b1220;padding:1rem;border-radius:8px;width:320px;display:flex;flex-direction:column;gap:.5rem} input{padding:.5rem;border-radius:6px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit}
  button{background:#7c3aed;color:#fff;padding:.5rem;border:0;border-radius:6px;cursor:pointer}
  </style></head><body>
  <div class="card">
    <h2>Entrar / Registrar</h2>
    <input id="email" placeholder="email"/>
    <input id="password" type="password" placeholder="senha"/>
    <div style="display:flex;gap:.5rem">
      <button id="btnLogin">Entrar</button>
      <button id="btnRegister">Registrar</button>
    </div>
    <div style="font-size:.85rem;color:#9aa4b2;margin-top:.5rem">Dica: cria admin via <code>/setup-admin</code> se precisar</div>
  </div>
<script>
async function post(path, body){ return fetch('/api'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()); }
document.getElementById('btnLogin').onclick = async ()=>{
  const email=document.getElementById('email').value, password=document.getElementById('password').value;
  const r = await post('/auth/login',{email,password});
  if(r.token){ localStorage.setItem('token', r.token); alert('logado'); location.href='/'; } else alert(JSON.stringify(r));
};
document.getElementById('btnRegister').onclick = async ()=>{
  const email=document.getElementById('email').value, password=document.getElementById('password').value;
  const r = await post('/auth/register',{email,password});
  if(r.token){ localStorage.setItem('token', r.token); alert('registrado'); location.href='/'; } else alert(JSON.stringify(r));
};
</script>
</body></html>`;
}

function editorHTML(){
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Criar História</title><style>
  body{margin:0;font-family:Inter,Arial;background:#071022;color:#e6eef6} .wrap{padding:1rem;margin-left:220px}
  input,textarea,select{width:100%;padding:.5rem;margin-top:.4rem;border-radius:6px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit}
  button{background:#7c3aed;color:#fff;padding:.5rem;border:0;border-radius:6px;cursor:pointer;margin-top:.6rem}
  </style></head><body>
  <div class="wrap">
    <h2>Criar História</h2>
    <input id="title" placeholder="Título"/>
    <input id="tags" placeholder="tags (vírgula)"/>
    <select id="type"><option value="leia">Leitura</option><option value="doar">Doar</option><option value="venda">Venda</option></select>
    <input id="price" placeholder="Preço (somente venda)"/>
    <textarea id="body" rows="12" placeholder="Conteúdo"></textarea>
    <button id="publish">Publicar</button>
  </div>
<script>
async function api(path, opts={}){ opts.headers = {...(opts.headers||{}), 'content-type':'application/json'}; const t=localStorage.getItem('token'); if(t) opts.headers.authorization = 'Bearer '+t; if(opts.body && typeof opts.body === 'object') opts.body=JSON.stringify(opts.body); const r = await fetch('/api'+path, opts); return r.json(); }
document.getElementById('publish').onclick = async ()=>{
  const data = {title:document.getElementById('title').value, excerpt:'', body:document.getElementById('body').value, tags:document.getElementById('tags').value.split(',').map(x=>x.trim()).filter(Boolean), type:document.getElementById('type').value, price: parseFloat(document.getElementById('price').value) || null};
  const r = await api('/stories',{method:'POST', body:data});
  if(r.id){ alert('publicado'); location.href='/'; } else alert(JSON.stringify(r));
};
</script>
</body></html>`;
}

function chatHTML(){
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Chat</title><style>body{margin:0;font-family:Inter,Arial;background:#071022;color:#e6eef6} .wrap{padding:1rem;margin-left:220px} input{padding:.5rem;border-radius:6px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:inherit} button{background:#7c3aed;color:#fff;padding:.4rem .6rem;border:0;border-radius:6px;cursor:pointer}</style></head><body>
  <div class="wrap">
    <h2>Chat</h2>
    <div><input id="conv" placeholder="ID da conversa (ou public)"/> <button id="join">Join</button></div>
    <div id="messages" style="height:300px;overflow:auto;border:1px solid #333;padding:8px;margin-top:8px"></div>
    <div style="display:flex;gap:.5rem;margin-top:.5rem"><input id="msg" placeholder="mensagem" style="flex:1"/><button id="send">Enviar</button></div>
  </div>
<script src="/socket.io/socket.io.js"></script>
<script>
const token = localStorage.getItem('token');
const socket = io('/', { auth: { token } });
document.getElementById('join').onclick = ()=>{ const id = document.getElementById('conv').value || 'public'; socket.emit('join',{conversationId:id}); alert('joined ' + id); };
socket.on('connect', ()=>console.log('connected'));
socket.on('message', m=>{ const el = document.createElement('div'); el.textContent = (m.senderId||'anon') + ': ' + m.content; document.getElementById('messages').appendChild(el); });
document.getElementById('send').onclick = ()=>{ const id = document.getElementById('conv').value||'public'; const content = document.getElementById('msg').value; socket.emit('message',{conversationId:id, senderId: (token? 'user': 'anon'), content}); document.getElementById('msg').value=''; };
</script>
</body></html>`;
}

function adminHTML(){
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Admin</title><style>body{margin:0;font-family:Inter,Arial;background:#071022;color:#e6eef6} .wrap{padding:1rem;margin-left:220px} textarea{width:100%;height:120px;background:transparent;border:1px solid rgba(255,255,255,0.04);color:inherit;padding:.5rem;border-radius:6px} button{background:#7c3aed;color:#fff;padding:.4rem .6rem;border:0;border-radius:6px;cursor:pointer}</style></head><body>
  <div class="wrap">
    <h2>Admin Center</h2>
    <textarea id="announcement" placeholder="Mensagem para todos"></textarea>
    <div style="margin-top:.5rem"><label><input type="checkbox" id="pinned"/> Pinned</label></div>
    <button id="send">Publicar aviso</button>
    <div id="status" style="margin-top:.5rem;color:var(--muted)"></div>
  </div>
<script>
document.getElementById('send').onclick = async ()=>{
  const token = localStorage.getItem('token');
  const res = await fetch('/api/admin/announce',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({message:document.getElementById('announcement').value,pinned: document.getElementById('pinned').checked})});
  const j = await res.json(); document.getElementById('status').textContent = JSON.stringify(j);
};
</script>
</body></html>`;
}

