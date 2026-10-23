import express from 'express';
import { createServer } from 'node:http';
import { randomInt } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { DIFFICULTIES, validPassword } from '../shared/rules.js';
import { act, makePlayer, newPassword, startGame, tick, view } from './game.js';

const app = express(), http = createServer(app), io = new Server(http);
const rooms = new Map();
function publish(room) {
  for (const player of room.players) if (player.id !== 'bot') io.to(player.id).emit('room', view(room, player));
}
function launch(room) {
  startGame(room);
  room.timer = setInterval(() => {
    tick(room);
    if (room.phase === 'finished') clearInterval(room.timer);
    publish(room);
  }, 150);
}
function leave(socket) {
  const room = rooms.get(socket.data.roomCode);
  if (!room) return;
  clearInterval(room.timer); rooms.delete(room.code);
  for (const player of room.players) {
    if (player.id === socket.id || player.id === 'bot') continue;
    const peer = io.sockets.sockets.get(player.id);
    if (peer) { peer.data.roomCode = null; peer.emit('roomClosed', '상대가 나가서 방이 종료되었습니다.'); }
  }
  socket.data.roomCode = null;
}
io.on('connection', (socket) => {
  function handle(event, callback) {
    socket.on(event, (input, reply) => {
      if (typeof reply !== 'function') return;
      const data = input && typeof input === 'object' ? input : {};
      callback(data, reply);
    });
  }
  handle('createRoom', (data, reply) => {
    const mode = data.mode === 'single' ? 'single' : 'multi';
    const difficulty = mode === 'single' && Object.hasOwn(DIFFICULTIES, data.difficulty) ? data.difficulty : mode === 'multi' ? 'normal' : 'easy';
    if (!(mode === 'single' && difficulty === 'challenge') && !validPassword(data.secret)) return reply({ error: '숫자 4자리 비밀번호를 설정해 주세요.' });
    leave(socket);
    let code; do { code = String(randomInt(10000, 100000)); } while (rooms.has(code));
    const player = makePlayer(socket.id, 'Player 1');
    player.secret = validPassword(data.secret) ? data.secret : newPassword(); player.ready = true;
    const room = { code, host: socket.id, mode, difficulty, phase: 'lobby', players: [player], winner: null };
    if (mode === 'single') {
      player.items.firewall = DIFFICULTIES[difficulty].firewalls;
      const bot = makePlayer('bot', 'AI'); bot.secret = newPassword(); bot.ready = true; bot.tutorialDone = true;
      room.players.push(bot);
    }
    rooms.set(code, room); socket.data.roomCode = code;
    publish(room); reply({ ok: true });
  });
  handle('joinRoom', (data, reply) => {
    const room = rooms.get(typeof data.code === 'string' ? data.code.trim() : '');
    if (!room) return reply({ error: '방 코드를 확인해 주세요.' });
    if (room.mode !== 'multi' || room.phase !== 'lobby' || room.players.length >= 2) return reply({ error: '이미 입장이 완료되었거나 시작한 방입니다.' });
    leave(socket); room.players.push(makePlayer(socket.id, 'Player 2'));
    socket.data.roomCode = room.code; publish(room); reply({ ok: true });
  });
  handle('setSecret', (data, reply) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.phase !== 'lobby') return reply({ error: '대기실에서만 설정할 수 있습니다.' });
    if (!validPassword(data.secret)) return reply({ error: '숫자 4자리를 입력해 주세요.' });
    const player = room.players.find((p) => p.id === socket.id);
    player.secret = data.secret; player.ready = true; publish(room); reply({ ok: true });
  });
  handle('setReady', (_data, reply) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.phase !== 'lobby') return reply({ error: '대기실에서만 준비할 수 있습니다.' });
    const player = room.players.find((p) => p.id === socket.id);
    if (!player.secret) return reply({ error: '비밀번호를 먼저 설정해 주세요.' });
    player.ready = !player.ready; publish(room); reply({ ok: true });
  });
  handle('tutorialComplete', (_data, reply) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.phase !== 'lobby') return reply({ error: '게임 시작 전에 튜토리얼을 완료해 주세요.' });
    const player = room.players.find((p) => p.id === socket.id);
    if (!player.secret) return reply({ error: '비밀번호를 먼저 설정해 주세요.' });
    player.tutorialDone = true;
    if (room.mode === 'single') launch(room);
    publish(room); reply({ ok: true });
  });
  handle('startGame', (_data, reply) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.host !== socket.id || room.phase !== 'lobby') return reply({ error: '방장만 게임을 시작할 수 있습니다.' });
    if (room.players.length !== 2 || !room.players.every((p) => p.ready && p.secret && p.tutorialDone)) return reply({ error: '두 플레이어 모두 튜토리얼과 준비를 완료해 주세요.' });
    launch(room); publish(room); reply({ ok: true });
  });
  handle('action', (data, reply) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return reply({ error: '진행 중인 방이 없습니다.' });
    const player = room.players.find((p) => p.id === socket.id);
    const result = act(room, player, data);
    if (!result.error) { if (room.phase === 'finished') clearInterval(room.timer); publish(room); }
    reply(result);
  });
  socket.on('leaveRoom', () => leave(socket)); socket.on('disconnect', () => leave(socket));
});
app.get('/api/health', (_req, res) => res.json({ ok: true, game: 'Astra Hacker' }));
if (process.argv.includes('--production')) app.use(express.static(fileURLToPath(new URL('../dist', import.meta.url))));
else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true, hmr: { server: http } }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
http.listen(port, '0.0.0.0', () => {
  console.log(`Local: http://localhost:${port}`);
  for (const entries of Object.values(networkInterfaces())) for (const entry of entries || []) if (entry.family === 'IPv4' && !entry.internal) console.log(`Network: http://${entry.address}:${port}`);
});
