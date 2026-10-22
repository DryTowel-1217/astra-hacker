import { randomInt, randomBytes } from 'node:crypto';
import { ATTACKS, DIFFICULTIES, validPassword, interceptOptions, ARROWS } from '../shared/rules.js';

export const pick = (list) => list[randomInt(list.length)];
export const newPassword = () => String(randomInt(10000)).padStart(4, '0');
export const newIp = () => `A-${randomInt(10, 100)}.${randomInt(10, 100)}`;
function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export const makePlayer = (id, name) => ({ id, name, secret: null, ip: newIp(), ready: false, lastAttack: null, spoofBlockedIp: null, hintCount: 0, defenses: 0, clears: 0, lives: 3, items: { vpn: 0, firewall: 0, ddos: 0 }, incomingBoost: 0, logs: [] });
function log(player, text) {
  player.logs.unshift({ id: (player.logId = (player.logId || 0) + 1), text });
  player.logs = player.logs.slice(0, 30);
}
function hint(room, player, reason) {
  if (player.hintCount >= 4) { log(player, `${reason} · 이미 비밀번호 4자리를 모두 확보했습니다.`); return; }
  player.hintCount++;
  log(player, `${reason} · 상대 비밀번호 ${player.hintCount}번째 자리 확보!`);
}
export const levelOf = (room) => Math.floor((room.round - 1) / 3);
export function availableAttacks(room, player) {
  const peer = room.players.find((p) => p !== player);
  return Object.keys(ATTACKS).filter((id) => id === 'brute' || (id !== player.lastAttack && !(id === 'spoof' && player.spoofBlockedIp === peer.ip)));
}
function useVpn(room, player) {
  const peer = room.players.find((p) => p !== player);
  if (player.items.vpn > 0 && peer.spoofBlockedIp === player.ip) {
    player.items.vpn--;
    const previous = player.ip;
    do { player.ip = newIp(); } while (player.ip === previous);
    log(player, `VPN 자동 사용 · 내 IP가 ${player.ip}로 변경됐습니다.`);
    log(peer, '상대가 VPN을 사용했습니다. 스푸핑을 다시 사용할 수 있습니다.');
  }
}
function grantItems(room, player) {
  for (const id of ['vpn', 'firewall', 'ddos']) player.items[id]++;
  log(player, '피싱 방어 보상 · VPN, 방화벽, DDoS 각 1개 획득');
  useVpn(room, player);
}
export function startGame(room, now = Date.now()) {
  room.phase = 'playing'; room.round = 1; room.halfTurns = 0; room.pending = null;
  room.turn = room.mode === 'single' ? 0 : randomInt(2);
  room.stage = room.difficulty === 'challenge' ? 'preparing' : 'attack';
  room.nextAt = now + 1000;
  room.attackDeadline = room.mode === 'single' ? now + 10000 : null;
  for (const player of room.players) log(player, `${room.players[room.turn].name} 선공 · Astra Hacker 시작`);
}
function next(room, now) {
  room.pending = null; room.result = null;
  if (room.mode === 'single' && room.difficulty === 'challenge') {
    room.round++; room.stage = 'preparing'; room.nextAt = now + 1200; return;
  }
  room.halfTurns++;
  const previous = room.round;
  room.round = Math.floor(room.halfTurns / 2) + 1;
  room.turn = 1 - room.turn; room.stage = 'attack';
  room.nextAt = now + 1300;
  room.attackDeadline = room.mode === 'single' && room.turn === 0 ? now + 10000 : null;
  if (room.round !== previous && levelOf(room) !== Math.floor((previous - 1) / 3)) {
    for (const p of room.players) log(p, `난이도 상승 · Lv.${levelOf(room) + 1}`);
  }
}
function finishDefense(room, success, now) {
  const pending = room.pending;
  const attacker = room.players[room.turn];
  const defender = room.players[1 - room.turn];
  defender.defenses++;
  let saved = false;
  if (success) {
    defender.clears++;
    if (pending.attack === 'spoof') { attacker.spoofBlockedIp = defender.ip; useVpn(room, defender); }
    if (pending.attack === 'phishing') grantItems(room, defender);
  } else if (defender.items.firewall > 0) {
    defender.items.firewall--; saved = true;
    log(defender, '방화벽 자동 사용 · 방어 실패를 1회 만회했습니다.');
  }
  const challenge = room.mode === 'single' && room.difficulty === 'challenge';
  if (!success && !saved) {
    if (challenge) defender.lives--;
    else if (room.mode === 'multi') hint(room, attacker, '상대 방어 실패');
  }
  if (room.mode === 'single' && !challenge && defender.id !== 'bot' && defender.defenses % DIFFICULTIES[room.difficulty].every === 0) hint(room, defender, `방어 ${defender.defenses}회 달성`);
  const title = success ? '방어 성공' : saved ? '방화벽으로 보호됨' : '방어 실패';
  log(defender, `${ATTACKS[pending.attack].name} · ${title}`);
  log(attacker, `${ATTACKS[pending.attack].name} · 상대 ${title}`);
  room.result = { attack: pending.attack, defender: defender.id, success, saved, title };
  room.stage = 'result'; room.nextAt = now + 1900;
  if (challenge && defender.lives <= 0) { room.phase = 'finished'; room.winner = null; }
}
function makePending(room, attack, route, now) {
  const defender = room.players[1 - room.turn];
  const level = Math.min(8, levelOf(room) + defender.incomingBoost);
  defender.incomingBoost = 0;
  const id = randomBytes(8).toString('hex');
  const pending = { id, attack, level, progress: 0, deadline: now + ATTACKS[attack].seconds * 1000, botAt: now + 1700 };
  if (attack === 'spoof') {
    const realIp = room.players[room.turn].ip;
    const options = new Set([realIp]);
    while (options.size < 3 + level) options.add(newIp());
    pending.options = shuffle([...options]); pending.answer = realIp; pending.referenceIp = realIp;
  }
  if (attack === 'ransom') { pending.sequence = Array.from({ length: 4 + level }, (_, i) => String.fromCharCode(65 + i)); pending.options = shuffle(pending.sequence); }
  if (attack === 'intercept') { pending.options = Array.from({ length: interceptOptions(level) }, (_, i) => i); pending.answer = route; }
  if (attack === 'phishing') {
    pending.reference = { title: '아이템 획득', item: pick(['VPN', '방화벽', 'DDoS']), stars: pick([2, 3, 4]), seal: '✦' };
    pending.answer = randomInt(2 + level);
    pending.options = Array.from({ length: 2 + level }, (_, i) => i === pending.answer ? { ...pending.reference } : ({ ...pending.reference, ...pick([{ title: '아이템 획득!' }, { item: `${pending.reference.item} +` }, { stars: pending.reference.stars + 1 }, { seal: '✧' }]) }));
  }
  if (attack === 'replay') pending.sequence = Array.from({ length: 4 + level }, () => pick(ARROWS));
  room.pending = pending; room.stage = 'defense';
}
export function act(room, player, input, now = Date.now()) {
  const data = input && typeof input === 'object' ? input : {};
  const { type } = data;
  if (room.phase !== 'playing') return { error: '진행 중인 게임이 아닙니다.' };
  const mine = room.players.indexOf(player);
  if (type === 'ddos') {
    if (player.items.ddos < 1) return { error: 'DDoS 아이템이 없습니다.' };
    const target = room.mode === 'single' ? player : room.players[1 - mine];
    if (target.incomingBoost > 0) return { error: '이미 다음 공격에 DDoS가 적용되어 있습니다.' };
    player.items.ddos--; target.incomingBoost = 1;
    log(player, 'DDoS 사용 · 상대의 다음 방어 미니게임 난이도 +1');
    log(target, 'DDoS 감지 · 다음 방어 미니게임의 난이도가 1 증가합니다.');
    return { ok: true };
  }
  if (type === 'defend') {
    const pending = room.pending;
    if (room.stage !== 'defense' || mine === room.turn || data.id !== pending?.id) return { error: '현재 진행 중인 내 방어가 아닙니다.' };
    if (now >= pending.deadline) { finishDefense(room, false, now); return { ok: true }; }
    if (['ransom', 'replay'].includes(pending.attack)) {
      if (data.value !== pending.sequence[pending.progress]) finishDefense(room, false, now);
      else {
        pending.progress++;
        if (pending.progress === pending.sequence.length) finishDefense(room, true, now);
      }
    } else {
      if (pending.attack === 'spoof' && !pending.options.includes(data.value)) return { error: '표시된 IP를 선택해 주세요.' };
      if (['intercept', 'phishing'].includes(pending.attack) && (!Number.isInteger(data.value) || data.value < 0 || data.value >= pending.options.length)) return { error: '표시된 선택지를 골라 주세요.' };
      const success = pending.attack === 'intercept' ? data.value !== pending.answer : data.value === pending.answer;
      finishDefense(room, success, now);
    }
    return { ok: true };
  }
  if (type !== 'attack' || room.stage !== 'attack' || mine !== room.turn) return { error: '지금은 내 공격 시간이 아닙니다.' };
  if (room.mode === 'single' && mine === 0) {
    if (room.difficulty === 'challenge') return { error: '챌린지는 방어만 진행합니다.' };
    if (now >= room.attackDeadline) { next(room, now); return { ok: true }; }
    if (data.attack === 'skip') { log(player, '공격 건너뛰기'); next(room, now); return { ok: true }; }
    if (data.attack !== 'brute') return { error: '싱글 공격은 비밀번호 입력 또는 건너뛰기만 가능합니다.' };
  }
  if (!availableAttacks(room, player).includes(data.attack)) return { error: '연속 사용 또는 스푸핑 잠금으로 선택할 수 없는 공격입니다.' };
  if (data.attack === 'brute') {
    if (!validPassword(data.guess)) return { error: '숫자 4자리 비밀번호를 입력해 주세요.' };
    const peer = room.players[1 - mine];
    if (data.guess === peer.secret) { room.phase = 'finished'; room.winner = player.id; log(player, '브루스 포스 성공 · 상대 비밀번호 해제'); }
    else { log(player, '브루스 포스 실패 · 비밀번호가 다릅니다.'); player.lastAttack = 'brute'; next(room, now); }
    return { ok: true };
  }
  const effectiveLevel = Math.min(8, levelOf(room) + room.players[1 - mine].incomingBoost);
  if (data.attack === 'intercept' && (!Number.isInteger(data.route) || data.route < 0 || data.route >= interceptOptions(effectiveLevel))) return { error: '가로챌 경로를 선택해 주세요.' };
  player.lastAttack = data.attack;
  makePending(room, data.attack, data.route, now);
  log(player, `${ATTACKS[data.attack].name} 공격 · 상대 방어 진행 중`);
  return { ok: true };
}
export function tick(room, now = Date.now()) {
  if (room.phase !== 'playing') return;
  if (room.stage === 'result' && now >= room.nextAt) { next(room, now); return; }
  if (room.stage === 'defense') {
    if (now >= room.pending.deadline) { finishDefense(room, false, now); return; }
    const defender = room.players[1 - room.turn];
    if (defender.id === 'bot' && now >= room.pending.botAt) finishDefense(room, randomInt(100) < 55, now);
    return;
  }
  if (room.stage === 'preparing' && now >= room.nextAt) {
    room.turn = 1;
    const bot = room.players[1];
    const attack = pick(availableAttacks(room, bot).filter((id) => id !== 'brute'));
    bot.lastAttack = attack;
    makePending(room, attack, randomInt(interceptOptions(Math.min(8, levelOf(room) + room.players[0].incomingBoost))), now);
    return;
  }
  if (room.stage === 'attack') {
    if (room.mode === 'single' && room.turn === 0 && now >= room.attackDeadline) { log(room.players[0], '공격 선택 시간 초과 · 자동 건너뛰기'); next(room, now); return; }
    const bot = room.players[room.turn];
    if (bot.id === 'bot' && now >= room.nextAt) {
      const available = availableAttacks(room, bot).filter((id) => id !== 'brute');
      const attack = pick(available);
      act(room, bot, { type: 'attack', attack, route: randomInt(interceptOptions(Math.min(8, levelOf(room) + room.players[0].incomingBoost))) }, now);
    }
  }
}
export function view(room, player, now = Date.now()) {
  const index = room.players.indexOf(player), peer = room.players[1 - index];
  const pending = room.pending;
  let mini = null;
  if (pending && room.stage === 'defense') {
    mini = { attack: pending.attack, seconds: Math.max(0, (pending.deadline - now) / 1000), level: pending.level };
    if (index !== room.turn) {
      mini = { ...mini, id: pending.id, progress: pending.progress,
        ...(pending.options ? { options: pending.options } : {}),
        ...(pending.sequence ? { sequence: pending.sequence } : {}),
        ...(pending.reference ? { reference: pending.reference } : {}),
        ...(pending.referenceIp ? { referenceIp: pending.referenceIp } : {}),
      };
    }
  }
  return {
    code: room.code, mode: room.mode, difficulty: room.difficulty, phase: room.phase, stage: room.stage,
    host: room.host === player.id, myTurn: index === room.turn, round: room.round || 1, level: room.round ? levelOf(room) + 1 : 1,
    winner: room.winner ? (room.winner === player.id ? 'me' : 'opponent') : null,
    players: room.players.map((p) => ({ name: p.name, me: p.id === player.id, ready: p.ready })),
    me: { secret: player.secret, ip: player.ip, items: player.items, hint: peer?.secret?.slice(0, player.hintCount) || '', defenses: player.defenses, clears: player.clears, lives: player.lives, boost: player.incomingBoost },
    available: peer ? availableAttacks(room, player) : [],
    routeCount: peer ? interceptOptions(Math.min(8, (room.round ? levelOf(room) : 0) + peer.incomingBoost)) : 4,
    mini, logs: player.logs,
    attackSeconds: room.attackDeadline ? Math.max(0, (room.attackDeadline - now) / 1000) : null,
    result: room.result ? { ...room.result, defender: room.result.defender === player.id ? 'me' : 'opponent' } : null,
  };
}
