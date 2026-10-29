import React, { useEffect, useState } from 'react';
import { ATTACKS, DIFFICULTIES, ITEM_NAMES } from '../shared/rules.js';
import MiniGame from './MiniGame.jsx';
import Inventory from './Inventory.jsx';

export const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export function ResultScreen({ room, home }) {
  const challenge = room.difficulty === 'challenge', win = room.winner === 'me';
  return <main className={`final-screen ${challenge ? 'challenge-result' : win ? 'victory' : 'defeat'}`} aria-labelledby="result-title">
    <svg className="victory-star" viewBox="0 0 200 240" aria-hidden="true"><path d="M100 8 L124 88 L190 120 L124 148 L100 232 L76 148 L10 120 L76 88 Z" /></svg>
    <p className="eyebrow">ASTRA HACKER / {challenge ? 'CHALLENGE' : 'DUEL COMPLETE'}</p>
    <h1 id="result-title">{challenge ? 'CHALLENGE' : win ? 'VICTORY' : 'DEFEAT'}</h1>
    <h2>{challenge ? `${room.me.clears}개 클리어` : win ? '승리! 당신의 별을 지켜냈습니다.' : '패배. 당신의 별은 해킹당했습니다.'}</h2>
    {!challenge && !win && room.mode === 'single' && <p>내 비밀번호 4자리가 모두 드러났습니다.</p>}<div className="final-stats"><span>플레이 시간 <strong>{formatTime(room.elapsed)}</strong></span><span>진행 턴 <strong>{room.round}</strong></span><span>방어 성공 <strong>{room.me.clears}회</strong></span></div>
    <button className="gold-button" onClick={home}>시작 화면으로 돌아가기</button>
  </main>;
}

export default function GameBoard({ room, send, busy, disabled, home }) {
  const [selected, setSelected] = useState(room.mode === 'single' ? 'brute' : 'ransom');
  const [route, setRoute] = useState(0), [guess, setGuess] = useState(''), [showSecret, setShowSecret] = useState(true);
  const action = (data) => send('action', data);
  const myAttack = room.myTurn && room.stage === 'attack';
  const myDefense = !room.myTurn && room.stage === 'defense';
  const challenge = room.difficulty === 'challenge', tutorialMode = room.difficulty === 'tutorial';
  const boxCooldown = room.mode === 'multi' ? room.cooldowns.box || 0 : 0;
  useEffect(() => {
    if ((selected === 'box' && boxCooldown > 0) || (selected !== 'box' && !room.available.includes(selected))) setSelected(room.mode === 'single' ? 'brute' : room.available.find((id) => id !== 'brute') || 'brute');
    if (route >= room.routeCount) setRoute(0);
  }, [room.available.join(','), room.routeCount, selected, route, room.mode, boxCooldown]);
  const exposure = room.me.exposure;
  const attacks = room.mode === 'single' && !tutorialMode ? [['brute', ATTACKS.brute]] : Object.entries(ATTACKS);
  return <main className="game-shell">
    <div className="game-topline"><div><p className="eyebrow">{room.mode === 'single' ? `SINGLE / ${DIFFICULTIES[room.difficulty].name}` : `MULTIPLAYER / ${room.code}`}</p><h1>{myDefense ? '내 보안을 지켜라' : myAttack ? '상대 보안에 도전하라' : room.stage === 'result' ? '공방 결과' : '상대의 행동을 기다리는 중'}</h1></div><div className="turn-status"><strong>{room.round}턴</strong><span>난이도 Lv.{room.level}</span><button className="quiet-button" onClick={home}>나가기</button></div></div>
    <div className="dashboard">
      <section className={`stat-panel own-security ${exposure >= 3 ? 'critical' : ''}`}><div className="secret-and-exposure"><div><div className="stat-label">내 비밀번호 <button className="tiny-button" onClick={() => setShowSecret(!showSecret)}>{showSecret ? '숨기기' : '보기'}</button></div><div className="password-slots small">{[...(showSecret ? room.me.secret : '••••')].map((digit, i) => <span key={i} className={i < exposure ? 'exposed' : ''}>{digit}</span>)}</div><p>내 IP <b className="ip-text">{room.me.ip}</b></p></div><div className="exposure-meter" aria-label={`내 비밀번호 ${exposure}자리 노출`}><span>상대가 알아낸<br />내 비밀번호</span><strong>{exposure}<small> / 4</small></strong><div>{[0, 1, 2, 3].map((i) => <i key={i} className={i < exposure ? 'exposed' : ''} />)}</div><b>{exposure >= 3 ? '위험! 해제 직전' : exposure ? '일부 노출됨' : '아직 안전해요'}</b></div></div></section>
      <section className="stat-panel enemy-secret"><div className="stat-label">확보한 상대 비밀번호 힌트</div><div className="password-slots">{Array.from({ length: 4 }, (_, i) => <span className={room.me.hint[i] !== undefined ? 'revealed' : ''} key={i}>{room.me.hint[i] ?? '?'}</span>)}</div><p>첫 번째 자리부터 공개됩니다. <span className="peer-ip">상대 IP <b>{room.peerIp ?? '방어 중 숨김'}</b></span></p></section>
      <section className="stat-panel"><div className="stat-label">{challenge ? '남은 목숨 / 클리어' : '내 방어 기록'}</div>{challenge ? <div className="lives">{'♥'.repeat(room.me.lives)}{'♡'.repeat(3 - room.me.lives)} <small>{room.me.clears}개 클리어</small></div> : <strong className="defense-count">{room.me.defenses}<small>회 방어 · {room.me.clears}회 성공</small></strong>}<p>3턴마다 난이도 상승 · 아이템 자동 지급 없음</p></section>
    </div>
    <div className="battle-layout"><div className="battle-main">
      {myDefense && room.mini ? <MiniGame key={room.mini.id} mini={room.mini} send={action} busy={busy} /> : room.stage === 'result' && room.result ? room.result.kind === 'box' ? <section className="battle-panel box-result"><span className="box-emblem">✧</span><p className="eyebrow">STARLIGHT SUPPLY</p><h2>{room.result.actor === 'me' ? room.result.title : '상대가 보급 상자를 열었습니다.'}</h2><p>{room.result.actor === 'me' ? '공격 차례를 사용했습니다. 잠시 후 공수가 교대됩니다.' : '잠시 후 내 공격 차례가 됩니다.'}</p></section> : <section className={`battle-panel defense-result ${room.result.success || room.result.saved ? 'success' : 'failure'}`}><span className="result-icon">{room.result.success || room.result.saved ? '✦' : '!'}</span><p className="eyebrow">{room.result.defender === 'me' ? 'MY DEFENSE' : 'OPPONENT DEFENSE'}</p><h2>{room.result.defender === 'me' ? room.result.title : `상대 ${room.result.title}`}</h2>{room.result.reward && room.result.defender === 'me' && <strong className="reward-pill">{room.result.reward === 'none' ? '보상은 꽝 · 아이템 없음' : `${ITEM_NAMES[room.result.reward]} 1개 획득`}</strong>}<p>{ATTACKS[room.result.attack].name} · 잠시 후 공수가 바뀝니다.</p></section> : myAttack ? <section className="battle-panel attack-panel">
        <div className="section-heading"><div><p className="eyebrow">ATTACK</p><h2>{room.mode === 'single' && !tutorialMode ? '비밀번호 입력 또는 보급 선택' : tutorialMode ? '튜토리얼 · 원하는 공격을 선택해 연습하세요' : '보안 공격 선택'}</h2></div>{room.attackSeconds !== null ? <div className={`attack-clock ${room.attackSeconds < 3 ? 'urgent' : ''}`}><strong>{Math.ceil(room.attackSeconds)}<small>초</small></strong><span>시간 초과 시 무작위 선택</span></div> : <div className="attack-clock"><strong>∞</strong><span>제한 시간 없음</span></div>}</div>
        <div className="attack-grid">{attacks.map(([id, attack]) => <button key={id} className={`attack-card ${selected === id ? 'selected' : ''}`} disabled={disabled || !room.available.includes(id)} onClick={() => setSelected(id)}><span>{attack.icon}</span><strong>{attack.name}</strong><small>{!room.available.includes(id) ? room.cooldowns[id] ? `내 공격 ${room.cooldowns[id]}회 후 사용` : 'VPN 사용 전 잠금' : attack.description}</small></button>)}<button className={`attack-card supply-card ${selected === 'box' ? 'selected' : ''}`} disabled={disabled || boxCooldown > 0} onClick={() => setSelected('box')}><span>✧</span><strong>별빛 보급 상자</strong><small>{boxCooldown > 0 ? `내 공격 ${boxCooldown}회 후 사용` : room.mode === 'multi' ? '공격 차례 소비 · 사용 후 2턴 재사용 대기' : '공격 차례를 소비해 아이템 하나에 도전합니다.'}</small></button></div>
        <form className="attack-form" onSubmit={(e) => { e.preventDefault(); action({ type: 'attack', attack: selected, guess, route }).then((ok) => { if (ok) setGuess(''); }); }}>
          {selected === 'brute' && <label className="code-field"><span className="sr-only">상대 비밀번호 입력</span><input aria-label="상대 비밀번호 입력" value={guess} onChange={(e) => setGuess(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="————" autoComplete="off" autoFocus required /></label>}
          {selected === 'intercept' && <fieldset className="route-picker"><legend>가로챌 경로를 먼저 고르세요</legend>{Array.from({ length: room.routeCount }, (_, n) => <button type="button" key={n} className={route === n ? 'selected' : ''} onClick={() => setRoute(n)}>경로 {n + 1}</button>)}</fieldset>}
          {selected === 'box' && <div className="box-odds">{room.mode === 'single' && !tutorialMode ? <><span>꽝 <b>80%</b></span><span>방화벽 <b>20%</b></span></> : <><span>DDoS <b>25%</b></span><span>VPN <b>25%</b></span><span>방화벽 <b>25%</b></span><span>꽝 <b>25%</b></span></>}<p>아이템을 얻지 못해도 공격 차례는 소비됩니다.</p></div>}
          <div className="attack-actions"><button className="gold-button" disabled={disabled || (selected === 'brute' && guess.length !== 4) || (selected === 'box' && boxCooldown > 0)}>{selected === 'box' ? '공격 대신 상자 열기' : selected === 'brute' ? '비밀번호 입력 · 브루스 포스' : `${ATTACKS[selected].name} 공격`}</button>{room.mode === 'single' && !tutorialMode && <button type="button" className="quiet-button" disabled={disabled} onClick={() => action({ type: 'attack', attack: 'skip' })}>건너뛰기 →</button>}</div>
        </form>
      </section> : <section className="battle-panel waiting-panel"><span className="waiting-orbit">✧</span><p className="eyebrow">{room.stage === 'defense' ? 'ATTACK IN PROGRESS' : 'NEXT PHASE'}</p><h2>{room.stage === 'defense' ? `상대가 ${ATTACKS[room.mini.attack].name} 방어 중` : challenge ? '다음 방어를 준비하세요' : '상대의 공격을 기다리고 있습니다'}</h2><p>{room.stage === 'defense' ? '방어가 끝나면 결과가 공개됩니다.' : tutorialMode ? '제한 시간 없이 연습할 수 있습니다.' : '상대는 10초 안에 공격을 선택합니다.'}</p>{room.mini && room.mini.seconds !== null && <span className="waiting-timer">{room.mini.seconds.toFixed(1)}초</span>}</section>}
    </div><aside className="battle-sidebar">{(!challenge || tutorialMode) && <Inventory room={room} disabled={disabled} action={action} />}<section className="elapsed-panel" aria-label="게임 진행 시간"><p className="eyebrow">PLAY TIME</p><h2>게임 진행 시간</h2><strong>{formatTime(room.elapsed)}</strong><p>게임 시작부터 경과한 시간</p></section></aside></div>
  </main>;
}
