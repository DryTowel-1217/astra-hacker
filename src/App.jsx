import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ATTACKS, DIFFICULTIES, ARROWS, ARROW_SYMBOL } from '../shared/rules.js';

const socket = io();
const stars = Array.from({ length: 55 }, (_, i) => ({ x: (i * 137.508) % 100, y: (i * 79.31) % 90, size: i % 7 === 0 ? 4 : 2 }));
function Sky({ dim }) {
  return <div className={`sky ${dim ? 'dim' : ''}`} aria-hidden="true"><div className="nebula" />{stars.map((s, i) => <span className="sky-star" key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${i % 5}s` }} />)}<svg className="comet" viewBox="0 0 1000 500"><defs><linearGradient id="tail"><stop stopColor="#ffe9a1" /><stop offset="1" stopColor="#9a99ff" stopOpacity="0" /></linearGradient><radialGradient id="core"><stop stopColor="#fff9da" /><stop offset=".55" stopColor="#f4cd76" /><stop offset="1" stopColor="#94a8ff" stopOpacity="0" /></radialGradient></defs><path d="M160 330 L970 0 L340 310 Z" fill="url(#tail)" opacity=".3" /><path d="M180 330 L900 40 M200 350 L950 80 M220 290 L790 30" stroke="url(#tail)" strokeWidth="3" /><circle cx="180" cy="330" r="115" fill="url(#core)" /><circle cx="180" cy="330" r="61" fill="#1a2442" stroke="#f2d58c" strokeWidth="1" /><path d="M145 333 L179 284 L212 333 L179 376Z M133 331H225 M179 270V390" fill="none" stroke="#ffe8a0" strokeWidth="2" /><circle cx="180" cy="330" r="78" fill="none" stroke="#e6c77f" strokeDasharray="2 12" /></svg><svg className="castle" viewBox="0 0 1600 250" preserveAspectRatio="none"><path d="M0 160 Q200 90 360 140 L360 100 L380 100 L380 68 L405 24 L430 68 L430 135 L460 135 L460 92 L480 92 L480 105 L500 105 L500 92 L520 92 L520 135 Q700 170 870 125 L870 80 L890 80 L890 30 L912 0 L935 30 L935 80 L955 80 L955 135 L990 135 L990 100 L1010 100 L1010 115 L1030 115 L1030 100 L1050 100 L1050 145 Q1330 95 1600 165 V250 H0Z" fill="#050b1c" /><path d="M0 165 Q210 100 360 145 M1050 150 Q1330 100 1600 170" fill="none" stroke="#c9a45a" strokeOpacity=".3" /></svg></div>;
}
function PasswordInput({ value, onChange, label = '게임용 비밀번호', length = 4, autoFocus = true }) {
  return <label className="code-field"><span className="sr-only">{label}</span><input aria-label={label} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))} inputMode="numeric" pattern={`[0-9]{${length}}`} maxLength={length} placeholder={'—'.repeat(length)} autoComplete="off" autoFocus={autoFocus} required /></label>;
}
function Popup({ value, original = false, onClick, disabled, index }) {
  const content = <><span className="popup-top">{original ? '원본 · 이것과 같은 팝업 찾기' : `팝업 ${index + 1}`}</span><strong>{value.title}</strong><span className="popup-seal">{value.seal}</span><b>{value.item}</b><span className="popup-stars">{'★'.repeat(value.stars)}</span></>;
  return onClick ? <button className="item-popup" disabled={disabled} onClick={onClick}>{content}</button> : <div className="item-popup original">{content}</div>;
}
function MiniGame({ mini, send, busy }) {
  const queue = useRef(Promise.resolve()), active = useRef(true);
  const submitRef = useRef(send); submitRef.current = send;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (mini.attack !== 'replay') return;
    const keydown = (event) => {
      if (!ARROWS.includes(event.key) || event.repeat) return;
      event.preventDefault();
      const key = event.key;
      queue.current = queue.current.then(() => active.current ? submitRef.current({ type: 'defend', id: mini.id, value: key }) : undefined);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [mini.id, mini.attack]);
  const submit = (value) => send({ type: 'defend', id: mini.id, value });
  return <section className="mini-game" aria-label={`${ATTACKS[mini.attack].name} 방어 미니게임`}>
    <div className="mini-heading"><div><span className="eyebrow">DEFENSE / LV.{mini.level + 1}</span><h2>{ATTACKS[mini.attack].name}</h2></div><strong className={`countdown ${mini.seconds < 2 ? 'urgent' : ''}`}>{mini.seconds.toFixed(1)}<small>초</small></strong></div><div className="time-track"><div style={{ width: `${Math.max(0, mini.seconds / ATTACKS[mini.attack].seconds * 100)}%` }} /></div>
    <p className="mini-instruction">{ATTACKS[mini.attack].description}</p>
    {mini.attack === 'spoof' && <><p className="reference-ip">상대의 진짜 IP <strong>{mini.referenceIp}</strong></p><div className="mini-options">{mini.options.map((ip) => <button key={ip} disabled={busy} onClick={() => submit(ip)} className="ip-option">{ip}</button>)}</div></>}
    {mini.attack === 'ransom' && <><p className="mini-help">다음 문자: <strong>{mini.sequence[mini.progress]}</strong> · {mini.progress} / {mini.sequence.length}</p><div className="letter-board">{mini.options.map((letter) => <button key={letter} className={mini.sequence.indexOf(letter) < mini.progress ? 'completed' : ''} disabled={busy || mini.sequence.indexOf(letter) < mini.progress} onClick={() => submit(letter)}>{letter}</button>)}</div></>}
    {mini.attack === 'intercept' && <><p className="mini-help">상대가 고른 경로와 겹치면 실패합니다. 한 곳을 선택하세요.</p><div className="mini-options routes">{mini.options.map((n) => <button key={n} disabled={busy} onClick={() => submit(n)}><span>⌘</span>경로 {n + 1}</button>)}</div></>}
    {mini.attack === 'phishing' && <><Popup value={mini.reference} original /><div className="popup-grid">{mini.options.map((value, i) => <Popup key={i} value={value} index={i} onClick={() => submit(i)} disabled={busy} />)}</div></>}
    {mini.attack === 'replay' && <><div className="arrow-sequence" aria-label="입력할 방향키">{mini.sequence.map((key, i) => <span key={i} className={i < mini.progress ? 'completed' : i === mini.progress ? 'current' : ''}>{ARROW_SYMBOL[key]}</span>)}</div><p className="mini-help">키보드 방향키로 입력하세요. 잘못 누르면 방어에 실패합니다.</p><div className="arrow-controls">{ARROWS.map((key) => <button key={key} aria-label={key} disabled={busy} onClick={() => submit(key)}>{ARROW_SYMBOL[key]}</button>)}</div></>}
  </section>;
}

export default function App() {
  const [connected, setConnected] = useState(socket.connected), [room, setRoom] = useState(null);
  const [panel, setPanel] = useState(null), [difficulty, setDifficulty] = useState('easy');
  const [secret, setSecret] = useState(''), [code, setCode] = useState(''), [guess, setGuess] = useState('');
  const [selected, setSelected] = useState('ransom'), [route, setRoute] = useState(0);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [showSecret, setShowSecret] = useState(true);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const connect = () => setConnected(true);
    const disconnect = () => { setConnected(false); setRoom(null); setPanel(null); setSecret(''); setMessage('연결이 끊겼습니다. 재연결 후 새 게임을 시작해 주세요.'); };
    const update = (next) => { setRoom(next); if (next.phase === 'playing' || next.phase === 'finished') setPanel(null); };
    const closed = (text) => { setRoom(null); setPanel(null); setSecret(''); setMessage(text); };
    socket.on('connect', connect); socket.on('disconnect', disconnect); socket.on('room', update); socket.on('roomClosed', closed);
    return () => { socket.off('connect', connect); socket.off('disconnect', disconnect); socket.off('room', update); socket.off('roomClosed', closed); };
  }, []);
  useEffect(() => {
    if (room && !room.available.includes(selected)) setSelected(room.available.find((id) => id !== 'brute') || 'brute');
    if (route >= (room?.routeCount || 4)) setRoute(0);
  }, [room?.available.join(','), room?.routeCount, selected, route]);
  function send(event, data) {
    setBusy(true); setMessage('');
    return new Promise((resolve) => socket.timeout(5000).emit(event, data, (err, result) => {
      setBusy(false);
      if (err) setMessage('서버 응답을 받지 못했습니다. 연결을 확인해 주세요.');
      else if (result?.error) setMessage(result.error);
      resolve(!err && !result?.error);
    }));
  }
  const action = (data) => send('action', data);
  function home() { socket.emit('leaveRoom'); setRoom(null); setPanel(null); setSecret(''); setGuess(''); setMessage(''); }
  function open(next) { setPanel(next); setSecret(''); setCode(''); setMessage(''); }
  async function create(mode) { if (await send('createRoom', { mode, difficulty, secret })) { setSecret(''); setPanel(null); } }
  const playing = room?.phase === 'playing', gameVisible = playing || room?.phase === 'finished';
  const myAttack = playing && room.myTurn && room.stage === 'attack';
  const myDefense = playing && !room.myTurn && room.stage === 'defense';
  const lobbySecret = room?.phase === 'lobby' && !room.me.secret;
  const overlay = !gameVisible && (!!panel || !!room);
  const disabled = !connected || busy;
  const challenge = room?.difficulty === 'challenge';
  const selectedAttack = room?.mode === 'single' ? 'brute' : selected;

  return <div className={`astra ${gameVisible ? 'in-game' : ''}`}>
    <Sky dim={overlay || gameVisible} />
    <header className="site-header"><span className="wordmark">✦ ASTRA <span>HACKER</span></span><span className={`connection ${connected ? 'online' : ''}`}>{connected ? '● 연결됨' : '○ 연결 중'}</span></header>
    {!gameVisible && <main className={`landing ${overlay ? 'behind' : ''}`} aria-hidden={overlay ? true : undefined} inert={overlay ? true : undefined}>
      <p className="landing-kicker">별빛 아래 펼쳐지는 보안 공방</p><h1>Astra <span>Hacker</span></h1><div className="title-rule"><i />✦<i /></div><p className="landing-subtitle">상대의 비밀번호를 해제하고, 나의 비밀은 지켜라.</p><div className="start-buttons"><button className="ornate-button" disabled={disabled} onClick={() => open('single')}><span>01</span>싱글 플레이<b>→</b></button><button className="ornate-button" disabled={disabled} onClick={() => open('multi')}><span>02</span>멀티 플레이<b>→</b></button></div><button className="help-link" onClick={() => setHelp(true)}>게임 방법 보기 ↗</button><p className="landing-footer">1–2 PLAYERS <span>✧</span> INFORMATION FESTIVAL</p>
    </main>}
    {overlay && <div className="modal-scrim"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="close" aria-label="처음으로 돌아가기" onClick={home}>×</button><span className="modal-ornament" aria-hidden="true">✦</span>
      {panel === 'single' && !room && <><p className="eyebrow">SINGLE PLAYER</p><h2 id="modal-title">난이도 선택</h2><p className="modal-description">공격할 때는 비밀번호 입력, 방어할 때는 미니게임.</p><div className="difficulty-grid">{Object.entries(DIFFICULTIES).map(([id, data]) => <button key={id} className={`difficulty-option ${difficulty === id ? 'selected' : ''}`} aria-pressed={difficulty === id} onClick={() => setDifficulty(id)}><strong>{data.name}</strong><small>{data.description}</small></button>)}</div><button className="gold-button" disabled={disabled} onClick={() => difficulty === 'challenge' ? create('single') : open('single-secret')}>{difficulty === 'challenge' ? '챌린지 시작' : '다음 · 비밀번호 설정'}</button></>}
      {panel === 'multi' && !room && <><p className="eyebrow">MULTIPLAYER</p><h2 id="modal-title">함께 별빛 속으로</h2><div className="multi-options"><button onClick={() => open('host-secret')}><span>✦</span><strong>방 만들기</strong><small>비밀번호를 설정하고 친구를 초대하세요.</small></button><button onClick={() => open('join')}><span>✧</span><strong>방 입장하기</strong><small>친구가 알려준 방 코드를 입력하세요.</small></button></div></>}
      {panel === 'join' && !room && <form onSubmit={(e) => { e.preventDefault(); send('joinRoom', { code }); }}><p className="eyebrow">JOIN A ROOM</p><h2 id="modal-title">방 코드 입력</h2><p className="modal-description">초대받은 숫자 5자리 코드를 입력하세요.</p><PasswordInput value={code} onChange={setCode} label="방 코드" length={5} /><button className="gold-button" disabled={disabled || code.length !== 5}>방 입장하기</button></form>}
      {((['single-secret', 'host-secret'].includes(panel) && !room) || lobbySecret) && <form onSubmit={(e) => { e.preventDefault(); if (room) send('setSecret', { secret }).then((ok) => { if (ok) setSecret(''); }); else create(panel === 'single-secret' ? 'single' : 'multi'); }}><p className="eyebrow">YOUR SECRET</p><h2 id="modal-title">비밀번호 설정</h2><p className="modal-description">나만의 숫자 4자리. 같은 숫자와 맨 앞의 0도 사용할 수 있어요.</p><PasswordInput value={secret} onChange={setSecret} /><button className="gold-button" disabled={disabled || secret.length !== 4}>{room ? '설정 완료' : panel === 'host-secret' ? '설정 완료 및 방 만들기' : '설정 완료 및 시작'}</button><p className="blessing">별의 축복이 함께하기를…</p></form>}
      {room?.phase === 'lobby' && !lobbySecret && <><p className="eyebrow">WAITING FOR THE STARS</p><h2 id="modal-title">대결 준비</h2><div className="lobby-players">{[0, 1].map((index) => { const p = room.players[index]; return <div key={index} className={`lobby-player player-${index}`}><h3>{p?.name || 'Player 2'} {p?.me && <small>나</small>}</h3><div className="star-avatar">{index === 0 ? '★' : '☆'}</div>{p?.me ? <button className={`ready-status ${p.ready ? 'ready' : ''}`} disabled={disabled} onClick={() => send('setReady', {})}>{p.ready ? '■ READY!' : '□ READY?'}</button> : <span className={`ready-status ${p?.ready ? 'ready' : ''}`}>{p ? p.ready ? '■ READY!' : '□ 비밀번호 설정 중' : '□ 입장 대기 중'}</span>}</div>; })}</div><button className="gold-button" disabled={disabled || !room.host || room.players.length !== 2 || !room.players.every((p) => p.ready)} onClick={() => send('startGame', {})}>{room.host ? '시작하기' : '방장의 시작을 기다리는 중'}</button><p className="modal-description">{room.players.length < 2 ? '친구에게 방 코드를 알려주세요.' : '두 사람 모두 준비하면 방장이 시작할 수 있습니다.'}</p></>}
    </section>{room?.mode === 'multi' && <aside className="room-badge"><small>방 코드</small><strong>{room.code}</strong></aside>}</div>}
    {gameVisible && <main className="game-shell">
      <div className="game-topline"><div><p className="eyebrow">{room.mode === 'single' ? `SINGLE / ${DIFFICULTIES[room.difficulty].name}` : `MULTIPLAYER / ${room.code}`}</p><h1>{room.phase === 'finished' ? challenge ? '챌린지 종료' : room.winner === 'me' ? '비밀번호 해제 성공' : '상대가 먼저 해제했습니다' : myDefense ? '내 보안을 지켜라' : myAttack ? '상대 보안에 도전하라' : room.stage === 'result' ? '공방 결과' : '상대의 행동을 기다리는 중'}</h1></div><div className="turn-status"><strong>{room.round}턴</strong><span>난이도 Lv.{room.level}</span><button className="quiet-button" onClick={home}>나가기</button></div></div>
      <div className="dashboard"><section className="stat-panel"><div className="stat-label">내 비밀번호 <button className="tiny-button" onClick={() => setShowSecret(!showSecret)}>{showSecret ? '숨기기' : '보기'}</button></div><div className="password-slots small">{[...(showSecret ? room.me.secret : '••••')].map((digit, i) => <span key={i}>{digit}</span>)}</div><p>내 IP <b className="ip-text">{room.me.ip}</b></p></section><section className="stat-panel enemy-secret"><div className="stat-label">확보한 상대 비밀번호 힌트</div><div className="password-slots">{Array.from({ length: 4 }, (_, i) => <span className={room.me.hint[i] !== undefined ? 'revealed' : ''} key={i}>{room.me.hint[i] ?? '?'}</span>)}</div><p>첫 번째 자리부터 순서대로 공개됩니다.</p></section><section className="stat-panel"><div className="stat-label">{challenge ? '남은 목숨 / 클리어' : '내 방어 기록'}</div>{challenge ? <div className="lives">{'♥'.repeat(room.me.lives)}{'♡'.repeat(3 - room.me.lives)} <small>{room.me.clears}개 클리어</small></div> : <strong className="defense-count">{room.me.defenses}<small>회 방어 · {room.me.clears}회 성공</small></strong>}<p>공격과 방어를 모두 하면 1턴 · 3턴마다 난이도 상승</p></section></div>
      <div className="battle-layout"><div className="battle-main">
        {room.phase === 'finished' ? <section className="battle-panel end-panel"><div className="end-star">✦</div><p className="eyebrow">{challenge ? 'CHALLENGE COMPLETE' : room.winner === 'me' ? 'ACCESS GRANTED' : 'ACCESS LOST'}</p><h2>{challenge ? `${room.me.clears}개 클리어` : room.winner === 'me' ? '별빛이 당신의 편입니다.' : '다음 대결에 다시 도전하세요.'}</h2><p>{room.me.defenses}회 방어 · {room.round}턴 진행</p><button className="gold-button" onClick={home}>시작 화면으로</button></section> : myDefense && room.mini ? <MiniGame key={room.mini.id} mini={room.mini} ownIp={room.me.ip} send={action} busy={busy} /> : room.stage === 'result' && room.result ? <section className={`battle-panel defense-result ${room.result.success || room.result.saved ? 'success' : 'failure'}`}><span className="result-icon">{room.result.success || room.result.saved ? '✦' : '!'}</span><p className="eyebrow">{room.result.defender === 'me' ? 'MY DEFENSE' : 'OPPONENT DEFENSE'}</p><h2>{room.result.defender === 'me' ? room.result.title : `상대 ${room.result.title}`}</h2><p>{ATTACKS[room.result.attack].name} · 잠시 후 공수가 바뀝니다.</p></section> : myAttack ? <section className="battle-panel"><div className="section-heading"><div><p className="eyebrow">ATTACK</p><h2>{room.mode === 'single' ? '비밀번호를 입력할까요?' : '보안 공격 선택'}</h2></div>{room.attackSeconds !== null && <strong className="attack-timer">{Math.ceil(room.attackSeconds)}초</strong>}</div>
          {room.mode === 'multi' && <div className="attack-grid">{Object.entries(ATTACKS).map(([id, attack]) => <button key={id} className={`attack-card ${selected === id ? 'selected' : ''}`} disabled={disabled || !room.available.includes(id)} onClick={() => setSelected(id)}><span>{attack.icon}</span><strong>{attack.name}</strong><small>{!room.available.includes(id) ? id === 'spoof' ? '잠금 / 연속 사용 불가' : '연속 사용 불가' : attack.description}</small></button>)}</div>}
          <form className="attack-form" onSubmit={(e) => { e.preventDefault(); action({ type: 'attack', attack: selectedAttack, guess, route }).then((ok) => { if (ok) setGuess(''); }); }}>
            {selectedAttack === 'brute' && <PasswordInput value={guess} onChange={setGuess} label="상대 비밀번호 입력" />}
            {selectedAttack === 'intercept' && <fieldset className="route-picker"><legend>가로챌 경로를 먼저 고르세요</legend>{Array.from({ length: room.routeCount }, (_, n) => <button type="button" key={n} className={route === n ? 'selected' : ''} onClick={() => setRoute(n)}>경로 {n + 1}</button>)}</fieldset>}
            <div className="attack-actions"><button className="gold-button" disabled={disabled || (selectedAttack === 'brute' && guess.length !== 4)}>{selectedAttack === 'brute' ? '비밀번호 입력 · 브루스 포스' : `${ATTACKS[selectedAttack].name} 공격`}</button>{room.mode === 'single' && <button type="button" className="quiet-button" disabled={disabled} onClick={() => action({ type: 'attack', attack: 'skip' })}>건너뛰기 →</button>}</div>
          </form></section> : <section className="battle-panel waiting-panel"><span className="waiting-orbit">✧</span><p className="eyebrow">{room.stage === 'defense' ? 'ATTACK IN PROGRESS' : 'NEXT PHASE'}</p><h2>{room.stage === 'defense' ? `상대가 ${ATTACKS[room.mini.attack].name} 방어 중` : challenge ? '다음 방어를 준비하세요' : '잠시 기다려 주세요'}</h2><p>{room.stage === 'defense' ? '상대의 방어가 끝나면 결과가 공개됩니다.' : '별빛 속에서 다음 공격이 다가옵니다.'}</p>{room.mini && <span className="waiting-timer">{room.mini.seconds.toFixed(1)}초</span>}</section>}
      </div><aside className="battle-sidebar"><section className="battle-panel items-panel"><p className="eyebrow">INVENTORY</p><h2>내 아이템</h2><div className="inventory-item"><span>◎</span><div><strong>VPN <b>{room.me.items.vpn}</b></strong><small>스푸핑 방어 성공 후 IP 자동 변경</small></div><em>자동</em></div><div className="inventory-item"><span>▣</span><div><strong>방화벽 <b>{room.me.items.firewall}</b></strong><small>실패 1회 자동 만회</small></div><em>자동</em></div><div className="inventory-item"><span>ϟ</span><div><strong>DDoS <b>{room.me.items.ddos}</b></strong><small>{room.mode === 'single' ? '내 다음 방어 난이도 +1' : '상대 다음 방어 난이도 +1'}</small></div><button disabled={disabled || !playing || room.me.items.ddos < 1} onClick={() => action({ type: 'ddos' })}>사용</button></div>{room.me.boost > 0 && <p className="boost-warning">다음 방어에 난이도 +1 적용</p>}</section><section className="battle-panel log-panel"><p className="eyebrow">SYSTEM LOG</p><h2>진행 기록</h2><div role="log">{room.logs.map((entry) => <p key={entry.id}>{entry.text}</p>)}</div></section></aside></div>
    </main>}
    {message && <div className="toast" role="alert">{message}<button aria-label="알림 닫기" onClick={() => setMessage('')}>×</button></div>}
    {help && <div className="modal-scrim help-scrim"><section className="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button className="close" aria-label="도움말 닫기" onClick={() => setHelp(false)}>×</button><p className="eyebrow">HOW TO PLAY</p><h2 id="help-title">Astra Hacker</h2><p>내 공격에는 보안 공격을 선택하고, 상대 공격에는 제한 시간 안에 미니게임을 완료하세요. 상대가 방어에 실패하면 비밀번호 힌트를 한 자리 얻습니다.</p><p>공격 차례에 브루스 포스로 상대의 숫자 4자리를 맞히면 승리합니다. 같은 공격은 연속 사용할 수 없으며, 브루스 포스만 연속 사용할 수 있습니다.</p><p>싱글에서는 공격 시간 10초 안에 비밀번호를 입력하거나 건너뛰세요. 정해진 방어 횟수마다 힌트를 얻습니다. 챌린지는 목숨 3개로 클리어 기록에 도전합니다.</p><p>VPN·방화벽은 필요할 때 자동 사용됩니다. DDoS는 버튼으로 다음 미니게임 난이도를 올립니다. 피싱 방어에 성공하면 아이템 3종을 모두 얻습니다.</p><button className="gold-button" onClick={() => setHelp(false)}>알겠어요</button></section></div>}
  </div>;
}
