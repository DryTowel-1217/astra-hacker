import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlayer, startGame, act, tick, view, availableAttacks, levelOf, rollItem, cooldown, newIp } from '../server/game.js';
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
  assert.equal(room.pending.sequence.length, 3);
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
test('VPN은 획득/방어 성공 시 보관하고 수동 사용 시에만 IP 변경과 1개 소모', () => {
  const { room, a, b } = setup();
  const ip = b.ip;
  attack(room, a, 'spoof'); succeed(room, b);
  a.usedAt = {};
  assert.equal(a.spoofBlockedIp, ip);
  assert.equal(availableAttacks(room, a).includes('spoof'), false);
  transition(room); attack(room, b, 'brute', { guess: '9999' });
  a.usedAt = {}; b.items.vpn = 1;
  // Successful phishing awards a VPN and triggers automatic IP rotation when locked.
  attack(room, a, 'phishing'); room.pending.reward = 'vpn'; succeed(room, b);
  assert.equal(b.ip, ip);
  assert.equal(b.items.vpn, 2);
  assert.equal(act(room, b, { type: 'vpn' }, 1300).ok, true);
  assert.notEqual(b.ip, ip);
  assert.equal(b.items.vpn, 1);
  a.usedAt = {};
  assert.equal(availableAttacks(room, a).includes('spoof'), true);
});

test('스푸핑 잠금 상태에서 상자를 열어도 기존 VPN을 자동 소모하지 않는다', () => {
  const { room, a, b } = setup();
  a.items.vpn = 1; b.spoofBlockedIp = a.ip;
  const ip = a.ip;
  attack(room, a, 'box');
  assert.equal(a.ip, ip);
  assert.ok(a.items.vpn >= 1);
});

test('VPN이 없거나 게임이 종료됐으면 수동 사용 불가', () => {
  const { room, a } = setup(); const ip = a.ip;
  assert.ok(act(room, a, { type: 'vpn' }).error);
  assert.equal(a.ip, ip);
  a.items.vpn = 1; attack(room, a, 'brute', { guess: '3456' });
  assert.ok(act(room, a, { type: 'vpn' }).error);
  assert.equal(a.items.vpn, 1);
});
test('피싱 성공은 팝업에 표시된 아이템 하나만 지급하고 자동 사용 전까지 보관', () => {
  const { room, a, b } = setup();
  attack(room, a, 'phishing');
  assert.equal(room.pending.options.filter((o) => JSON.stringify(o) === JSON.stringify(room.pending.reference)).length, 1);
  const reward = room.pending.reward;
  succeed(room, b);
  assert.equal(b.items[reward], 1);
  assert.equal(Object.values(b.items).reduce((a, b) => a + b), 1);
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
  expire(room, 12000);
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
  assert.equal(room.pending.sequence.length, 4);
});
test('DDoS는 다음 방어 한 번에만 적용되고 중첩 사용을 막는다', () => {
  const { room, a, b } = setup(); a.items.ddos = 2;
  assert.equal(act(room, a, { type: 'ddos' }, 1050).ok, true);
  assert.ok(act(room, a, { type: 'ddos' }, 1060).error);
  attack(room, a, 'ransom');
  assert.equal(room.pending.level, 1);
  assert.equal(room.pending.sequence.length, 4);
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
test('싱글 공격 건너뛰기 후 방어 누적 횟수마다 힌트', () => {
  const { room, a } = setup('single', 'easy');
  assert.ok(attack(room, a, 'ransom').error);
  attack(room, a, 'skip');
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

test('일반 공격은 사용 후 내 공격 차례 2회 동안 잠기며 상자도 한 차례로 계산', () => {
  const { room, a, b } = setup();
  attack(room, a, 'ransom'); succeed(room, b); transition(room);
  assert.equal(cooldown(a, 'ransom'), 2);
  attack(room, b, 'brute', { guess: '9999' });
  assert.ok(attack(room, a, 'ransom').error);
  attack(room, a, 'box'); transition(room);
  assert.equal(cooldown(a, 'ransom'), 1);
  attack(room, b, 'brute', { guess: '9999' });
  assert.ok(attack(room, a, 'ransom').error);
  attack(room, a, 'brute', { guess: '9999' });
  assert.equal(cooldown(a, 'ransom'), 0);
  assert.equal(availableAttacks(room, a).includes('ransom'), true);
});
test('멀티 스푸핑 방어는 정답 IP와 상대 IP 필드 모두 숨긴다', () => {
  const { room, a, b } = setup();
  assert.match(newIp(), /^\d{3}$/);
  assert.equal(view(room, b).peerIp, a.ip);
  attack(room, a, 'spoof');
  const data = view(room, b);
  assert.equal(data.peerIp, null);
  assert.equal('referenceIp' in data.mini, false);
  assert.equal('answer' in data.mini, false);
  assert.ok(data.mini.options.includes(a.ip));
  assert.equal(data.mini.options.every((ip) => /^\d{3}$/.test(ip)), true);
});

test('일반 싱글과 챌린지 모두 스푸핑 방어 중 IP를 숨기고 평상시에는 표시', () => {
  for (const difficulty of ['easy', 'normal', 'hard', 'challenge']) {
    const { room, a, b } = setup('single', difficulty);
    room.round = 4; // AI 스푸핑은 3턴이 지난 뒤부터 허용
    room.stage = 'attack'; room.turn = 1; room.attackDeadline = 11000;
    assert.equal(view(room, a).peerIp, b.ip);
    assert.equal(attack(room, b, 'spoof').ok, true);
    const state = view(room, a);
    assert.equal(state.peerIp, null);
    assert.equal('referenceIp' in state.mini, false);
    assert.equal('answer' in state.mini, false);
    assert.ok(state.mini.options.includes(b.ip));
    succeed(room, a);
    assert.equal(view(room, a).peerIp, b.ip);
  }
});

test('챌린지 피싱은 100% 꽝이고 성공 시 방화벽 대신 클리어 수만 증가', () => {
  for (let roll = 0; roll < 100; roll++) assert.equal(rollItem('phishing', roll, 'single', 'challenge'), 'none');
  const { room, a, b } = setup('single', 'challenge');
  room.stage = 'attack'; room.turn = 1; room.attackDeadline = 11000;
  attack(room, b, 'phishing');
  assert.equal(room.pending.reward, 'none');
  assert.equal(view(room, a).mini.reference.item, '꽝');
  succeed(room, a);
  assert.deepEqual(a.items, { vpn: 0, firewall: 0, ddos: 0 });
  assert.equal(a.clears, 1);
  assert.equal(a.lives, 3);
  assert.equal(room.result.reward, 'none');
});
test('멀티 10초 초과는 사용 가능한 공격 무작위 선택, 늦은 제출도 무시', () => {
  for (const method of ['tick', 'late']) {
    const { room, a } = setup();
    a.usedAt.ransom = a.attackCount;
    if (method === 'tick') tick(room, 11001);
    else act(room, a, { type: 'attack', attack: 'brute', guess: '3456' }, 11001);
    assert.equal(room.phase, 'playing');
    assert.equal(room.stage, 'defense');
    assert.notEqual(room.pending.attack, 'ransom');
    assert.notEqual(room.pending.attack, 'brute');
  }
});
test('싱글 10초 초과는 허용된 공격 행동만 선택한다', () => {
  const { room } = setup('single');
  tick(room, 11001);
  assert.ok(room.turn === 1 || room.phase === 'finished');
  assert.notEqual(room.stage, 'defense');
});
test('상자와 피싱의 100개 확률 구간이 정확히 일치한다', () => {
  for (const [source, expected] of [['box', { ddos: 35, vpn: 35, firewall: 20, none: 10 }], ['phishing', { ddos: 45, vpn: 45, firewall: 10 }]]) {
    const counts = {};
    for (let i = 0; i < 100; i++) { const item = rollItem(source, i); counts[item] = (counts[item] || 0) + 1; }
    assert.deepEqual(counts, expected);
  }
});

test('싱글 상자/피싱 모두 꽝 80%, 방화벽 20%이고 VPN/DDoS가 나오지 않음', () => {
  for (const source of ['box', 'phishing']) {
    const counts = {};
    for (let i = 0; i < 100; i++) { const item = rollItem(source, i, 'single'); counts[item] = (counts[item] || 0) + 1; }
    assert.deepEqual(counts, { none: 80, firewall: 20 });
  }
  const { room, a } = setup('single');
  a.items.vpn = a.items.ddos = 1;
  assert.ok(act(room, a, { type: 'vpn' }).error);
  assert.ok(act(room, a, { type: 'ddos' }).error);
  assert.equal(a.items.vpn, 1); assert.equal(a.items.ddos, 1);
});

test('싱글 방어 실패는 방화벽 먼저 소모, 없으면 1자리씩 노출 후 4자리에서 패배', () => {
  const { room, a, b } = setup('single');
  a.items.firewall = 2;
  for (let i = 0; i < 6; i++) {
    assert.equal(attack(room, a, 'skip', {}, room.attackDeadline - 1).ok, true);
    tick(room, room.nextAt);
    const now = room.pending.deadline;
    act(room, a, { type: 'defend', id: room.pending.id, value: 'invalid' }, now);
    assert.equal(a.items.firewall, Math.max(0, 1 - i));
    assert.equal(view(room, a, now).me.exposure, Math.max(0, i - 1));
    assert.equal(view(room, b, now).me.hint, a.secret.slice(0, Math.max(0, i - 1)));
    if (i < 5) { assert.equal(room.phase, 'playing'); transition(room); }
  }
  assert.equal(room.phase, 'finished');
  assert.equal(view(room, a).winner, 'opponent');
  assert.equal(view(room, a).me.exposure, 4);
  const elapsed = view(room, a, room.endedAt).elapsed;
  tick(room, room.endedAt + 50000);
  assert.equal(view(room, a, room.endedAt + 50000).elapsed, elapsed);
});

test('싱글 피싱의 꽝 보상은 아이템을 늘리지 않으며 성공이면 내 비밀번호는 안전', () => {
  const { room, a, b } = setup('single');
  attack(room, a, 'skip');
  attack(room, b, 'phishing', {}, room.nextAt);
  room.pending.reward = 'none';
  succeed(room, a, room.pending.deadline - 1);
  assert.deepEqual(a.items, { vpn: 0, firewall: 0, ddos: 0 });
  assert.equal(room.result.reward, 'none');
  assert.equal(view(room, a).me.exposure, 0);
});
test('상자는 공격 차례를 소비하고 결과 대기 중 중복 획득을 막는다', () => {
  const { room, a, b } = setup();
  assert.ok(attack(room, b, 'box').error);
  assert.equal(attack(room, a, 'box').ok, true);
  const reward = room.result.item;
  assert.equal(room.stage, 'result');
  assert.equal(reward === 'none' ? Object.values(a.items).every((n) => n === 0) : a.items[reward] === 1, true);
  assert.ok(attack(room, a, 'box').error);
  transition(room);
  assert.equal(room.turn, 1);
});

test('멀티 상자는 다음 내 공격 2회 동안 잠기고 상대의 행동으로는 대기가 줄지 않음', () => {
  const { room, a, b } = setup();
  attack(room, a, 'box');
  assert.equal(view(room, a).cooldowns.box, 2);
  transition(room);
  attack(room, b, 'brute', { guess: '9999' });
  assert.equal(view(room, a).cooldowns.box, 2);
  for (let remaining = 2; remaining > 0; remaining--) {
    const before = { ...a.items }, count = a.attackCount;
    assert.ok(attack(room, a, 'box').error);
    assert.deepEqual(a.items, before);
    assert.equal(a.attackCount, count);
    assert.equal(room.turn, 0);
    assert.equal(attack(room, a, 'brute', { guess: '9999' }).ok, true);
    attack(room, b, 'brute', { guess: '9999' });
    assert.equal(view(room, a).cooldowns.box, remaining - 1);
  }
  assert.equal(attack(room, a, 'box').ok, true);
  assert.equal(view(room, a).cooldowns.box, 2);
});

test('일반 싱글 상자는 두 공격 차례 연속 열 수 있고 재사용 대기가 없음', () => {
  const { room, a } = setup('single');
  assert.equal(attack(room, a, 'box').ok, true);
  assert.equal(view(room, a).cooldowns.box, 0);
  transition(room);
  tick(room, room.nextAt);
  succeed(room, a, room.pending.deadline - 1);
  transition(room);
  assert.equal(room.turn, 0);
  assert.equal(attack(room, a, 'box', {}, room.attackDeadline - 1).ok, true);
  assert.equal(view(room, a).cooldowns.box, 0);
});
test('노출도는 상대 힌트 획득량이며 플레이 시간은 종료 시 멈춘다', () => {
  const { room, a, b } = setup();
  attack(room, a, 'ransom'); defend(room, b, 'Z');
  assert.equal(view(room, b).me.exposure, 1);
  assert.equal(view(room, a).me.exposure, 0);
  assert.equal(view(room, a, 6500).elapsed, 5);
  transition(room);
  act(room, b, { type: 'attack', attack: 'brute', guess: '0012' }, 7000);
  assert.equal(view(room, a, 50000).elapsed, 6);
});
test('새 기본 파일/화살표 개수와 빠른 연속 입력도 서버에서 순서대로 판정', () => {
  const { room, a, b } = setup();
  attack(room, a, 'ransom');
  assert.equal(room.pending.sequence.length, 3);
  for (const key of ['A', 'B', 'C']) defend(room, b, key, 1200);
  assert.equal(room.result.success, true);
  transition(room); attack(room, b, 'replay');
  assert.equal(room.pending.sequence.length, 5);
  for (const key of room.pending.sequence) defend(room, a, key, 1300);
  assert.equal(room.result.success, true);
});


test('쉬움/보통 난이도의 방어 제한 시간이 공격 종류에 맞게 적용된다', () => {
  for (const [difficulty, attackName, seconds] of [
    ['easy', 'ransom', 15], ['easy', 'spoof', 10],
    ['normal', 'ransom', 10], ['normal', 'spoof', 7],
  ]) {
    const { room, a } = setup('multi', difficulty);
    attack(room, a, attackName);
    assert.equal(room.pending.duration, seconds);
    assert.equal(room.pending.deadline, 1100 + seconds * 1000);
  }
});

test('튜토리얼 난이도는 공격 선택과 방어 제한 시간이 없다', () => {
  const { room, a, b } = setup('single', 'tutorial');
  assert.equal(view(room, a).attackSeconds, null);
  assert.equal(availableAttacks(room, a).length, 6);
  assert.equal(attack(room, a, 'spoof').ok, true);
  assert.equal(room.pending.duration, null);
  assert.equal(room.pending.deadline, Infinity);
  assert.equal(view(room, b).mini.seconds, null);
});
