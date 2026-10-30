import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
const socket = io(process.env.TEST_URL || 'http://localhost:3000', { transports: ['websocket'], reconnection: false });
let room, peerIp;
socket.on('room', (next) => { room = next; if (next.peerIp) peerIp = next.peerIp; });
const send = (event, data = {}) => new Promise((resolve, reject) => socket.timeout(3000).emit(event, data, (err, reply) => err ? reject(err) : reply.error ? reject(new Error(reply.error)) : resolve(reply)));
const action = (data) => send('action', data);
async function until(check) {
  const end = Date.now() + 7000;
  while (!check()) { if (Date.now() > end) throw new Error('Tutorial state transition timed out'); await new Promise((resolve) => setTimeout(resolve, 20)); }
}
try {
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
  await send('createRoom', { mode: 'single', difficulty: 'tutorial', secret: '0123' });
  await send('tutorialComplete');
  const seen = [];
  for (let i = 0; i < 5; i++) {
    await until(() => room.myTurn && room.stage === 'attack');
    assert.equal(room.me.hint.length, i < 5 ? 0 : 4);
    await action({ type: 'attack', attack: 'skip' });
    await until(() => room.stage === 'defense' && !room.myTurn);
    const mini = room.mini; seen.push(mini.attack);
    const values = mini.sequence || [mini.attack === 'spoof' ? peerIp : mini.attack === 'phishing' ? mini.options.findIndex((item) => JSON.stringify(item) === JSON.stringify(mini.reference)) : 0];
    for (const value of values) await action({ type: 'defend', id: mini.id, value });
    await until(() => room.stage === 'result');
    assert.equal(room.tutorial.seen.length, i + 1);
  }
  assert.deepEqual(seen, ['ransom', 'replay', 'intercept', 'phishing', 'spoof']);
  assert.equal(room.me.hint.length, 4);
  await until(() => room.myTurn && room.stage === 'attack');
  await action({ type: 'attack', attack: 'brute', guess: room.me.hint });
  await until(() => room.phase === 'finished');
  assert.equal(room.winner, 'me');
  console.log('PASS: tutorial cycle, all 4 hints, password submission, completion');
} finally { socket.disconnect(); }
