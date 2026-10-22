import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlayer, startGame, act, tick, view, availableAttacks, levelOf } from '../server/game.js';
import { validPassword, interceptOptions } from '../shared/rules.js';
function setup(mode = 'multi', difficulty = 'easy') {
  const a = makePlayer('a', 'Player 1'), b = makePlayer(mode === 'single' ? 'bot' : 'b', 'Player 2');
  a.secret = '0012'; b.secret = '3456'; a.ready = b.ready = true;
  const room = { mode, difficulty, host: 'a', players: [a, b], phase: 'lobby' };
  startGame(room, 1000); room.turn = 0;
  return { room, a, b };
}
const attack = (room, player, name, data = {}, now = 1100) => act(room, player, { type: 'attack', attack: name, ...data }, now);
const defend = (room, player, value, now = 1200) => act(room, player, { type: 'defend', id: room.pending.id, value }, now);
function expire(room, now = 10000) { tick(room, now); }
function transition(room) { tick(room, room.nextAt); }
function succeed(room, player, now = 1200) {
  const p = room.pending;
  if (p.sequence) for (const value of p.sequence) assert.equal(defend(room, player, value, now).ok, true);
  else assert.equal(defend(room, player, p.attack === 'intercept' ? (p.answer + 1) % p.options.length : p.answer, now).ok, true);
}

test('비밀번호는 선행 0과 중복을 허용하는 숫자 4자리', () => {
  for (const s of ['0000', '0012', '1234']) assert.equal(validPassword(s), true);
  for (const s of ['123', '12345', 'abcd', 1234, null]) assert.equal(validPassword(s), false);
});
test('내 공격 권한, 연속 공격 금지, 브루스 포스는 연속 가능', () => {
  const { room, a, b } = setup();
  assert.ok(attack(room, b, 'ransom').error);
  attack(room, a, 'ransom'); succeed(room, b); transition(room);
  assert.equal(room.turn, 1);
  attack(room, b, 'brute', { guess: '9999' });
  assert.equal(room.turn, 0);
  assert.equal(availableAttacks(room, a).includes('ransom'), false);
  a.lastAttack = 'brute';
  assert.equal(availableAttacks(room, a).includes('brute'), true);
});
test('랜섬웨어는 서버가 클릭 순서를 검증하고 오답이면 앞자리 힌트 공개', () => {
  const { room, a, b } = setup();
  attack(room, a, 'ransom');
  assert.equal(room.pending.sequence.length, 4);
  defend(room, b, 'B');
  assert.equal(room.result.success, false);
  assert.equal(view(room, a).me.hint, '3');
  assert.equal(view(room, b).me.hint, '');
  assert.equal(a.hintCount, 1);
});
test('방화벽은 방어 실패를 자동 만회하고 없을 때만 힌트가 열린다', () => {
  const { room, a, b } = setup();
  b.items.firewall = 2;
  attack(room, a, 'replay');
  defend(room, b, 'wrong');
  assert.equal(b.items.firewall, 1);
  assert.equal(room.result.saved, true);
  assert.equal(a.hintCount, 0);
});
test('스푸핑 방어 성공 시 IP 기준 잠금, VPN이 필요할 때 자동 사용된다', () => {
  const { room, a, b } = setup();
  const ip = b.ip;
  attack(room, a, 'spoof'); succeed(room, b);
  a.lastAttack = null;
  assert.equal(a.spoofBlockedIp, ip);
  assert.equal(availableAttacks(room, a).includes('spoof'), false);
  transition(room); attack(room, b, 'brute', { guess: '9999' });
  a.lastAttack = null; b.items.vpn = 1;
  // Successful phishing awards a VPN and triggers automatic IP rotation when locked.
  attack(room, a, 'phishing'); succeed(room, b);
  assert.notEqual(b.ip, ip);
  assert.equal(b.items.vpn, 1);
  a.lastAttack = null;
  assert.equal(availableAttacks(room, a).includes('spoof'), true);
});
test('VPN은 사용할 필요가 없으면 스택으로 남고 피싱 성공은 아이템 3종 지급', () => {
  const { room, a, b } = setup();
  attack(room, a, 'phishing');
  assert.equal(room.pending.options.filter((o) => JSON.stringify(o) === JSON.stringify(room.pending.reference)).length, 1);
  succeed(room, b);
  assert.deepEqual(b.items, { vpn: 1, firewall: 1, ddos: 1 });
  assert.equal(a.hintCount, 0);
});
test('가로채기는 경로 일치 시 실패, 공격자의 선택 경로는 방어자에게 비공개', () => {
  const { room, a, b } = setup();
  assert.ok(attack(room, a, 'intercept', { route: 9 }).error);
  attack(room, a, 'intercept', { route: 2 });
  const data = view(room, b);
  assert.equal('answer' in data.mini, false);
  assert.equal('route' in data.mini, false);
  defend(room, b, 2);
  assert.equal(room.result.success, false);
  assert.equal(interceptOptions(9), 2);
});
test('재전송은 키를 하나씩 판정, 중복/지난 미니게임 입력은 거절', () => {
  const { room, a, b } = setup();
  attack(room, a, 'replay'); const id = room.pending.id;
  succeed(room, b);
  assert.equal(room.result.success, true);
  assert.ok(act(room, b, { type: 'defend', id, value: 'ArrowUp' }, 1300).error);
  assert.equal(b.clears, 1);
});
test('서버 제한 시간으로 방어 실패 판정, 클라이언트 성공 주장 무시', () => {
  const { room, a, b } = setup();
  attack(room, a, 'spoof');
  assert.ok(act(room, a, { type: 'defend', id: room.pending.id, value: b.ip }, 1200).error);
  expire(room, 7000);
  assert.equal(a.hintCount, 1);
  assert.equal(b.defenses, 1);
});
test('양쪽이 공방한 뒤 1턴 증가, 3턴 이후 미니게임 난이도 상승', () => {
  const { room, a } = setup();
  for (let i = 0; i < 6; i++) {
    const actor = room.players[room.turn];
    attack(room, actor, 'brute', { guess: '9999' }, 1200 + i);
  }
  assert.equal(room.round, 4);
  assert.equal(levelOf(room), 1);
  attack(room, a, 'ransom');
  assert.equal(room.pending.sequence.length, 5);
});
test('DDoS는 다음 방어 한 번에만 적용되고 중첩 사용을 막는다', () => {
  const { room, a, b } = setup(); a.items.ddos = 2;
  assert.equal(act(room, a, { type: 'ddos' }, 1050).ok, true);
  assert.ok(act(room, a, { type: 'ddos' }, 1060).error);
  attack(room, a, 'ransom');
  assert.equal(room.pending.level, 1);
  assert.equal(room.pending.sequence.length, 5);
  assert.equal(b.incomingBoost, 0);
});
test('브루스 포스 정답은 즉시 승리하며 정답과 미니게임 해답이 상대에게 노출되지 않음', () => {
  const { room, a, b } = setup();
  const data = view(room, a);
  assert.equal(data.me.secret, '0012');
  assert.equal(JSON.stringify(data).includes('3456'), false);
  assert.equal('secret' in data.players[1], false);
  attack(room, a, 'brute', { guess: '3456' });
  assert.equal(room.phase, 'finished');
  assert.equal(view(room, b).winner, 'opponent');
  assert.ok(attack(room, b, 'brute', { guess: '0012' }).error);
});
test('싱글은 10초 후 공격 건너뛰기, 방어 누적 횟수마다 힌트', () => {
  const { room, a } = setup('single', 'easy');
  assert.ok(attack(room, a, 'ransom').error);
  tick(room, 11001);
  assert.equal(room.turn, 1);
  for (let i = 0; i < 3; i++) {
    tick(room, room.nextAt);
    assert.equal(room.stage, 'defense');
    succeed(room, a, room.pending.deadline - 1);
    transition(room);
    assert.equal(room.turn, 0);
    if (i < 2) attack(room, a, 'skip', {}, room.attackDeadline - 1);
  }
  assert.equal(a.defenses, 3);
  assert.equal(view(room, a).me.hint, '3');
});
test('싱글 보통 4회/어려움 6회 누적 방어마다 힌트 제공', () => {
  for (const [difficulty, count] of [['normal', 4], ['hard', 6]]) {
    const { room, a } = setup('single', difficulty);
    a.defenses = count - 1;
    attack(room, a, 'skip'); tick(room, room.nextAt);
    succeed(room, a, room.pending.deadline - 1);
    assert.equal(a.hintCount, 1);
  }
});
test('챌린지는 방어만 진행, 목숨 3개 소진 시 종료, 성공만 클리어 집계', () => {
  const { room, a } = setup('single', 'challenge');
  for (let i = 0; i < 3; i++) {
    tick(room, room.nextAt);
    assert.equal(room.stage, 'defense');
    tick(room, room.pending.deadline);
    if (i < 2) transition(room);
  }
  assert.equal(room.phase, 'finished');
  assert.equal(a.lives, 0);
  assert.equal(a.clears, 0);
  assert.equal(a.hintCount, 0);
});
