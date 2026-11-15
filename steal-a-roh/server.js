/* =========================================================
   Steal a Roh — 멀티플레이 중계 서버 (설치할 것 없음, Node.js만 있으면 됨)
   - 게임 파일(index.html 등)을 보여주고
   - /ws 주소로 방(방 코드)을 만들어 방장 ↔ 친구들 메시지를 전달해요
   실행: node server.js   (주소: http://localhost:8080)
   ========================================================= */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const ROOT = process.env.STATIC_DIR || __dirname;
const MAX_PLAYERS = 8;
const MAX_MSG = 256 * 1024;

/* ---------- 게임 파일 보여주기 ---------- */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};
const HIDDEN = new Set(['server.js', 'package.json', 'package-lock.json', 'node_modules', '.git']);

/* ---------- 접속 통계 (서버가 켜진 뒤부터 · 서버가 잠들거나 재시작하면 0부터) ---------- */
const STATS = { since: Date.now(), pageViews: 0, visitors: new Set(), roomsMade: 0, joins: 0, peakOnline: 0 };
function kst(t) { return new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }); }
function onlineNow() { let n = 0; rooms.forEach((r) => { n += 1 + r.clients.size; }); return n; }
function visitorKey(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  return crypto.createHash('sha256').update(ip + '|' + (req.headers['user-agent'] || '')).digest('hex').slice(0, 16);
}
function logLine(msg) { console.log('[' + kst(Date.now()) + '] ' + msg); }
function statsPage() {
  const roomRows = [];
  rooms.forEach((r) => roomRows.push('<tr><td>' + r.code + '</td><td>' + (1 + r.clients.size) + '명</td><td>' + kst(r.made) + '</td></tr>'));
  return '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta http-equiv="refresh" content="10"><title>Steal a Roh 접속 통계</title><style>body{font-family:system-ui,sans-serif;background:#0f1d3a;color:#fff;padding:20px;line-height:1.7}'
    + 'b{color:#ffd54a;font-size:1.2em}table{border-collapse:collapse;margin-top:8px}td,th{border:1px solid #456;padding:4px 10px}small{color:#9fb3c8}</style></head><body>'
    + '<h2>📊 Steal a Roh 접속 통계</h2><small>서버가 켜진 때: ' + kst(STATS.since) + ' (무료 서버는 잠들면 다시 0부터 세요) · 10초마다 새로고침</small>'
    + '<p>👀 게임 화면 연 횟수: <b>' + STATS.pageViews + '</b><br>🧑 다른 기기 수(대략): <b>' + STATS.visitors.size + '</b><br>'
    + '🏠 만들어진 방: <b>' + STATS.roomsMade + '</b> · 🚪 참가 횟수: <b>' + STATS.joins + '</b><br>'
    + '🟢 지금 멀티 중: <b>' + onlineNow() + '명</b> (방 ' + rooms.size + '개) · 📈 최대 동시 접속: <b>' + STATS.peakOnline + '명</b></p>'
    + (roomRows.length ? '<table><tr><th>방 코드</th><th>인원</th><th>만든 시간</th></tr>' + roomRows.join('') + '</table>' : '<small>지금 열린 방이 없어요</small>')
    + '</body></html>';
}

const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { res.writeHead(400); res.end(); return; }
  if (url === '/stats') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(statsPage()); return; }
  if (url === '/' || url === '/index.html') {
    STATS.pageViews++;
    const k = visitorKey(req), isNew = !STATS.visitors.has(k);
    if (STATS.visitors.size < 100000) STATS.visitors.add(k);
    logLine('👀 게임 접속' + (isNew ? ' (새 기기)' : '') + ' · 총 ' + STATS.pageViews + '회 / 기기 ' + STATS.visitors.size + '대');
  }
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok ' + rooms.size + ' rooms'); return; }
  if (url.endsWith('/')) url += 'index.html';
  const file = path.normalize(path.join(ROOT, url));
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || path.isAbsolute(rel) || HIDDEN.has(rel.split(path.sep)[0])) { res.writeHead(404); res.end('not found'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    /* html·js·css는 매번 새 버전인지 확인 (업데이트가 바로 보이게), 그림·소리는 1시간 저장 */
    const ext = path.extname(file).toLowerCase();
    const lm = st.mtime.toUTCString();
    const fresh = ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json';
    const ims = req.headers['if-modified-since'];
    if (ims && Math.floor(st.mtimeMs / 1000) <= Math.floor(Date.parse(ims) / 1000)) {
      res.writeHead(304, { 'Last-Modified': lm, 'Cache-Control': fresh ? 'no-cache' : 'public, max-age=3600' }); res.end(); return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Last-Modified': lm,
      'Cache-Control': fresh ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(file).pipe(res);
  });
});

/* ---------- 아주 작은 WebSocket 구현 (텍스트 메시지만) ---------- */
function wsAccept(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return null; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const ws = { socket, alive: true, closed: false, buf: Buffer.alloc(0), frags: [], onmsg: null, onclose: null };
  ws.send = (obj) => { if (!ws.closed) writeFrame(ws, 0x1, Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))); };
  ws.close = () => {
    if (ws.closed) return;
    try { writeFrame(ws, 0x8, Buffer.alloc(0)); } catch (e) {}
    finish(ws); setTimeout(() => socket.destroy(), 200);
  };
  socket.on('data', (d) => { ws.buf = Buffer.concat([ws.buf, d]); parse(ws); });
  socket.on('close', () => finish(ws));
  socket.on('error', () => finish(ws));
  return ws;
}
function finish(ws) { if (ws.closed) return; ws.closed = true; if (ws.onclose) ws.onclose(); }
function writeFrame(ws, op, payload) {
  const n = payload.length;
  let head;
  if (n < 126) { head = Buffer.from([0x80 | op, n]); }
  else if (n < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(n, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
  ws.socket.write(Buffer.concat([head, payload]));
}
function parse(ws) {
  while (ws.buf.length >= 2) {
    const b0 = ws.buf[0], b1 = ws.buf[1], fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f, off = 2;
    if (len === 126) { if (ws.buf.length < 4) return; len = ws.buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (ws.buf.length < 10) return; len = Number(ws.buf.readBigUInt64BE(2)); off = 10; }
    if (len > MAX_MSG) { ws.close(); return; }
    const mo = off; if (masked) off += 4;
    if (ws.buf.length < off + len) return;
    let data = ws.buf.subarray(off, off + len);
    if (masked) { const mask = ws.buf.subarray(mo, mo + 4); data = Buffer.from(data); for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3]; }
    ws.buf = ws.buf.subarray(off + len);
    if (op === 0x8) { ws.close(); return; }
    if (op === 0x9) { writeFrame(ws, 0xA, data); continue; }
    if (op === 0xA) { ws.alive = true; continue; }
    if (op === 0x1 || op === 0x0) {
      ws.frags.push(Buffer.from(data));
      if (fin) {
        const txt = Buffer.concat(ws.frags).toString('utf8'); ws.frags = [];
        let m; try { m = JSON.parse(txt); } catch (e) { continue; }
        if (ws.onmsg) ws.onmsg(m);
      }
    }
  }
}

/* ---------- 방 ---------- */
const rooms = new Map(); // code -> {host, clients: Map(id -> ws)}
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  for (let k = 0; k < 50; k++) {
    let c = ''; for (let i = 0; i < 5; i++) c += LETTERS[crypto.randomInt(LETTERS.length)];
    if (!rooms.has(c)) return c;
  }
  return null;
}
function newId() { return 'w' + crypto.randomBytes(5).toString('hex'); }

server.on('upgrade', (req, socket) => {
  if ((req.url || '').split('?')[0] !== '/ws') { socket.destroy(); return; }
  const ws = wsAccept(req, socket);
  if (!ws) return;
  ws.id = newId(); ws.room = null; ws.isHost = false;
  ws.onmsg = (m) => {
    if (!m || typeof m !== 'object') return;
    const room = ws.room;
    if (m.op === 'host' && !room) {
      const code = newCode();
      if (!code) { ws.send({ op: 'err', msg: '서버가 바빠요. 잠시 후 다시 해 보세요' }); return; }
      const r = { code, host: ws, clients: new Map(), made: Date.now() };
      rooms.set(code, r); ws.room = r; ws.isHost = true;
      ws.send({ op: 'hosted', code, id: ws.id });
      STATS.roomsMade++; STATS.peakOnline = Math.max(STATS.peakOnline, onlineNow());
      logLine('🏠 방 만듦 ' + code + ' · 지금 멀티 ' + onlineNow() + '명');
    } else if (m.op === 'join' && !room) {
      const code = String(m.code || '').toUpperCase();
      const r = rooms.get(code);
      if (!r) { ws.send({ op: 'err', msg: '방을 찾지 못했어요. 코드를 다시 확인하세요' }); return; }
      if (r.clients.size + 1 >= MAX_PLAYERS) { ws.send({ op: 'err', msg: '방이 꽉 찼어요 (최대 ' + MAX_PLAYERS + '명)' }); return; }
      r.clients.set(ws.id, ws); ws.room = r;
      ws.send({ op: 'joined', code, id: ws.id, host: r.host.id });
      STATS.joins++; STATS.peakOnline = Math.max(STATS.peakOnline, onlineNow());
      logLine('🚪 참가 ' + code + ' (' + (1 + r.clients.size) + '명) · 지금 멀티 ' + onlineNow() + '명');
      r.host.send({ op: 'peer', id: ws.id });
    } else if (room && ws.isHost && m.op === 'to') {
      const c = room.clients.get(m.id); if (c) c.send({ op: 'm', m: m.m });
    } else if (room && ws.isHost && m.op === 'bc') {
      const out = JSON.stringify({ op: 'm', m: m.m });
      room.clients.forEach((c) => c.send(out));
    } else if (room && ws.isHost && m.op === 'kick') {
      const c = room.clients.get(m.id); if (c) c.close();
    } else if (room && !ws.isHost && m.op === 'up') {
      room.host.send({ op: 'm', from: ws.id, m: m.m });
    }
  };
  ws.onclose = () => {
    const r = ws.room; if (!r) return;
    if (ws.isHost) {
      rooms.delete(r.code);
      logLine('📴 방 닫힘 ' + r.code + ' · 지금 멀티 ' + (onlineNow() - r.clients.size) + '명');
      r.clients.forEach((c) => { c.send({ op: 'closed' }); c.close(); });
    } else if (r.clients.get(ws.id) === ws) {
      r.clients.delete(ws.id);
      logLine('👋 나감 ' + r.code + ' (' + (1 + r.clients.size) + '명 남음)');
      r.host.send({ op: 'left', id: ws.id });
    }
  };
});

/* 연결이 조용히 끊긴 사람 정리 + 무료 서버가 연결을 끊지 않게 주기적으로 신호 */
const allSockets = () => { const a = []; rooms.forEach((r) => { a.push(r.host); r.clients.forEach((c) => a.push(c)); }); return a; };
setInterval(() => {
  allSockets().forEach((ws) => {
    if (!ws.alive) { ws.socket.destroy(); finish(ws); return; }
    ws.alive = false;
    try { writeFrame(ws, 0x9, Buffer.alloc(0)); } catch (e) {}
  });
}, 25000);

server.listen(PORT, () => {
  console.log('Steal a Roh 서버 실행 중: http://localhost:' + PORT);
});
