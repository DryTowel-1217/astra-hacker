import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
const clients = [], url = process.env.TEST_URL || 'http://localhost:3000';
async function client() {
  const s = io(url, { transports: ['websocket'], reconnection: false }); clients.push(s);
  s.on('room', (room) => { s.room = room; });
  await new Promise((resolve, reject) => { s.once('connect', resolve); s.once('connect_error', reject); });
  return s;
}
const send = (s, event, data = {}) => new Promise((resolve, reject) => s.timeout(3000).emit(event, data, (err, result) => err ? reject(err) : resolve(result)));
const act = (s, data) => send(s, 'action', data);
async function until(check, timeout = 7000) {
  const end = Date.now() + timeout;
  while (!check()) { if (Date.now() > end) throw new Error('Timed out waiting for room state'); await new Promise((r) => setTimeout(r, 20)); }
}
try {
  const a = await client(), b = await client(), c = await client();
  assert.ok((await send(a, 'createRoom', { mode: 'multi', secret: '123' })).error);
  assert.equal((await send(a, 'createRoom', { mode: 'multi', secret: '0012' })).ok, true);
  assert.match(a.room.code, /^\d{5}$/);
  assert.equal((await send(b, 'joinRoom', { code: a.room.code })).ok, true);
  assert.ok((await send(c, 'joinRoom', { code: a.room.code })).error);
  assert.ok((await send(a, 'startGame')).error);
  assert.equal((await send(b, 'setSecret', { secret: '3456' })).ok, true);
  assert.equal('secret' in b.room.players[0], false);
  assert.equal(b.room.me.secret, '3456');
  assert.ok((await send(b, 'startGame')).error);
  assert.equal((await send(a, 'startGame')).ok, true);
  await until(() => b.room.phase === 'playing');
  let attacker = a.room.myTurn ? a : b, defender = attacker === a ? b : a;
  assert.ok((await act(defender, { type: 'attack', attack: 'ransom' })).error);
  assert.equal((await act(attacker, { type: 'attack', attack: 'ransom' })).ok, true);
  await until(() => defender.room.mini?.id);
  assert.equal('sequence' in attacker.room.mini, false);
  const mini = defender.room.mini;
  for (const value of mini.sequence) assert.equal((await act(defender, { type: 'defend', id: mini.id, value })).ok, true);
  await until(() => defender.room.stage === 'result');
  assert.equal(defender.room.result.success, true);
  await until(() => defender.room.myTurn && defender.room.stage === 'attack');
  [attacker, defender] = [defender, attacker];
  await act(attacker, { type: 'attack', attack: 'phishing' });
  await until(() => defender.room.mini?.id);
  const phishing = defender.room.mini;
  const value = phishing.options.findIndex((item) => JSON.stringify(item) === JSON.stringify(phishing.reference));
  await act(defender, { type: 'defend', id: phishing.id, value });
  await until(() => defender.room.me.items.vpn === 1);
  assert.deepEqual(defender.room.me.items, { vpn: 1, firewall: 1, ddos: 1 });
  await until(() => defender.room.myTurn && defender.room.stage === 'attack');
  await act(defender, { type: 'ddos' });
  await act(defender, { type: 'attack', attack: 'brute', guess: defender === a ? '3456' : '0012' });
  await until(() => attacker.room.phase === 'finished');
  assert.equal(defender.room.winner, 'me');
  const closed = new Promise((resolve) => b.once('roomClosed', resolve)); a.emit('leaveRoom'); await closed;
  await send(c, 'createRoom', { mode: 'single', difficulty: 'easy', secret: '0000' });
  assert.equal(c.room.me.items.firewall, 2);
  assert.equal(c.room.myTurn, true);
  assert.ok((await act(c, { type: 'attack', attack: 'spoof' })).error);
  await act(c, { type: 'attack', attack: 'skip' });
  await until(() => c.room.stage === 'defense');
  assert.equal(c.room.myTurn, false);
  assert.ok(c.room.mini.id);
  console.log('PASS: 5자리 방 코드, 준비/방장 시작, 권한, 미니게임 입력/결과, 피싱 보상, 비밀정보 보호, 승패, 싱글 난이도/방어');
} finally { clients.forEach((s) => s.disconnect()); }
