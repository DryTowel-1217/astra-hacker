import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { DIFFICULTIES } from '../shared/rules.js';
import GameBoard, { ResultScreen } from './GameBoard.jsx';
import Tutorial from './Tutorial.jsx';

const socket = io();
const stars = Array.from({ length: 55 }, (_, i) => ({ x: (i * 137.508) % 100, y: (i * 79.31) % 90, size: i % 7 === 0 ? 4 : 2 }));
function Sky({ dim }) {
  return <div className={`sky ${dim ? 'dim' : ''}`} aria-hidden="true"><div className="nebula" />{stars.map((s, i) => <span className="sky-star" key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${i % 5}s` }} />)}<svg className="comet" viewBox="0 0 1000 500"><defs><linearGradient id="tail"><stop stopColor="#ffe9a1" /><stop offset="1" stopColor="#9a99ff" stopOpacity="0" /></linearGradient><radialGradient id="core"><stop stopColor="#fff9da" /><stop offset=".55" stopColor="#f4cd76" /><stop offset="1" stopColor="#94a8ff" stopOpacity="0" /></radialGradient></defs><path d="M160 330 L970 0 L340 310 Z" fill="url(#tail)" opacity=".3" /><path d="M180 330 L900 40 M200 350 L950 80 M220 290 L790 30" stroke="url(#tail)" strokeWidth="3" /><circle cx="180" cy="330" r="115" fill="url(#core)" /><circle cx="180" cy="330" r="61" fill="#1a2442" stroke="#f2d58c" strokeWidth="1" /><path d="M145 333 L179 284 L212 333 L179 376Z M133 331H225 M179 270V390" fill="none" stroke="#ffe8a0" strokeWidth="2" /><circle cx="180" cy="330" r="78" fill="none" stroke="#e6c77f" strokeDasharray="2 12" /></svg><svg className="castle" viewBox="0 0 1600 250" preserveAspectRatio="none"><path d="M0 160 Q200 90 360 140 L360 100 L380 100 L380 68 L405 24 L430 68 L430 135 L460 135 L460 92 L480 92 L480 105 L500 105 L500 92 L520 92 L520 135 Q700 170 870 125 L870 80 L890 80 L890 30 L912 0 L935 30 L935 80 L955 80 L955 135 L990 135 L990 100 L1010 100 L1010 115 L1030 115 L1030 100 L1050 100 L1050 145 Q1330 95 1600 165 V250 H0Z" fill="#050b1c" /><path d="M0 165 Q210 100 360 145 M1050 150 Q1330 100 1600 170" fill="none" stroke="#c9a45a" strokeOpacity=".3" /></svg></div>;
}
function PasswordInput({ value, onChange, label = '게임용 비밀번호', length = 4, autoFocus = true }) {
  return <label className="code-field"><span className="sr-only">{label}</span><input aria-label={label} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))} inputMode="numeric" pattern={`[0-9]{${length}}`} maxLength={length} placeholder={'—'.repeat(length)} autoComplete="off" autoFocus={autoFocus} required /></label>;
}
export default function App() {
  const [connected, setConnected] = useState(socket.connected), [room, setRoom] = useState(null);
  const [panel, setPanel] = useState(null), [difficulty, setDifficulty] = useState('easy');
  const [secret, setSecret] = useState(''), [code, setCode] = useState('');
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const connect = () => setConnected(true);
    const disconnect = () => { setConnected(false); setRoom(null); setPanel(null); setSecret(''); setMessage('연결이 끊겼습니다. 재연결 후 새 게임을 시작해 주세요.'); };
    const update = (next) => { setRoom(next); if (next.phase === 'playing' || next.phase === 'finished') setPanel(null); };
    const closed = (text) => { setRoom(null); setPanel(null); setSecret(''); setMessage(text); };
    socket.on('connect', connect); socket.on('disconnect', disconnect); socket.on('room', update); socket.on('roomClosed', closed);
    return () => { socket.off('connect', connect); socket.off('disconnect', disconnect); socket.off('room', update); socket.off('roomClosed', closed); };
  }, []);
  function send(event, data) {
    setBusy(true); setMessage('');
    return new Promise((resolve) => socket.timeout(5000).emit(event, data, (err, result) => {
      setBusy(false);
      if (err) setMessage('서버 응답을 받지 못했습니다. 연결을 확인해 주세요.');
      else if (result?.error) setMessage(result.error);
      resolve(!err && !result?.error);
    }));
  }
  function home() { socket.emit('leaveRoom'); setRoom(null); setPanel(null); setSecret(''); setHelp(false); setMessage(''); }
  function open(next) { setPanel(next); setSecret(''); setCode(''); setMessage(''); }
  async function create(mode) { if (await send('createRoom', { mode, difficulty, secret })) { setSecret(''); setPanel(null); } }
  const playing = room?.phase === 'playing', gameVisible = playing || room?.phase === 'finished';
  const lobbySecret = room?.phase === 'lobby' && !room.me.secret;
  const overlay = !gameVisible && (!!panel || !!room);
  const disabled = !connected || busy;
  const tutorialRequired = room?.phase === 'lobby' && !!room.me.secret && !room.me.tutorialDone;

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
      {room?.phase === 'lobby' && !lobbySecret && <><p className="eyebrow">WAITING FOR THE STARS</p><h2 id="modal-title">대결 준비</h2><button className="help-link" onClick={() => setHelp(true)}>튜토리얼 다시 보기 ↗</button><div className="lobby-players">{[0, 1].map((index) => { const p = room.players[index]; return <div key={index} className={`lobby-player player-${index}`}><h3>{p?.name || 'Player 2'} {p?.me && <small>나</small>}</h3><div className="star-avatar">{index === 0 ? '★' : '☆'}</div><p className="tutorial-status">{p ? p.tutorialDone ? '튜토리얼 완료 ✓' : '튜토리얼 진행 중' : '입장 대기 중'}</p>{p?.me ? <button className={`ready-status ${p.ready ? 'ready' : ''}`} disabled={disabled} onClick={() => send('setReady', {})}>{p.ready ? '■ READY!' : '□ READY?'}</button> : <span className={`ready-status ${p?.ready ? 'ready' : ''}`}>{p ? p.ready ? '■ READY!' : '□ 비밀번호 설정 중' : '□ 입장 대기 중'}</span>}</div>; })}</div><button className="gold-button" disabled={disabled || !room.host || room.players.length !== 2 || !room.players.every((p) => p.ready && p.tutorialDone)} onClick={() => send('startGame', {})}>{room.host ? '시작하기' : '방장의 시작을 기다리는 중'}</button><p className="modal-description">{room.players.length < 2 ? '친구에게 방 코드를 알려주세요.' : '두 사람 모두 준비하면 방장이 시작할 수 있습니다.'}</p></>}
    </section>{room?.mode === 'multi' && <aside className="room-badge"><small>방 코드</small><strong>{room.code}</strong></aside>}</div>}
    {room?.phase === 'finished' ? <ResultScreen room={room} home={home} /> : playing && <GameBoard room={room} home={home} send={send} busy={busy} disabled={disabled} />}
    {message && <div className="toast" role="alert">{message}<button aria-label="알림 닫기" onClick={() => setMessage('')}>×</button></div>}
    {(tutorialRequired || help) && <Tutorial key={tutorialRequired ? room.code : 'manual'} mode={room?.mode || 'multi'} difficulty={room?.difficulty} busy={busy} onExit={() => tutorialRequired ? home() : setHelp(false)} onFinish={async () => { if (tutorialRequired) await send('tutorialComplete', {}); else setHelp(false); }} />}
  </div>;
}
