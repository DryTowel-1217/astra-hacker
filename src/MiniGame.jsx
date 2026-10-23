import React, { useEffect, useRef, useState } from 'react';
import { ATTACKS, ARROWS, ARROW_SYMBOL } from '../shared/rules.js';

export function Popup({ value, original = false, onClick, disabled, index }) {
  const content = <><span className="popup-top">{original ? '원본 · 이것과 같은 팝업 찾기' : `팝업 ${index + 1}`}</span><strong>{value.title}</strong><span className="popup-seal">{value.seal}</span><b>{value.item}</b><span className="popup-stars">{'★'.repeat(value.stars)}</span></>;
  return onClick ? <button className="item-popup" disabled={disabled} onClick={onClick}>{content}</button> : <div className="item-popup original">{content}</div>;
}

export default function MiniGame({ mini, send, busy }) {
  const [localProgress, setLocalProgress] = useState(mini.progress);
  const progressRef = useRef(mini.progress), active = useRef(true), submitRef = useRef(null);
  const progress = Math.max(localProgress, mini.progress);
  progressRef.current = Math.max(progressRef.current, mini.progress);
  useEffect(() => () => { active.current = false; }, []);
  // Feedback is immediate. Socket.IO preserves event order, and the server still
  // checks every input and the deadline. No round-trip wait between file clicks.
  function submit(value) {
    if (!active.current) return;
    if (mini.sequence) {
      const step = progressRef.current;
      if (step >= mini.sequence.length) return;
      if (value === mini.sequence[step]) {
        progressRef.current = step + 1; setLocalProgress(step + 1);
      } else active.current = false;
    }
    return send({ type: 'defend', id: mini.id, value });
  }
  submitRef.current = submit;
  useEffect(() => {
    if (mini.attack !== 'replay') return;
    const keydown = (event) => {
      if (!ARROWS.includes(event.key) || event.repeat) return;
      event.preventDefault(); submitRef.current(event.key);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [mini.id, mini.attack]);
  return <section className="mini-game" aria-label={`${ATTACKS[mini.attack].name} 방어 미니게임`}>
    <div className="mini-heading"><div><span className="eyebrow">DEFENSE / LV.{mini.level + 1}</span><h2>{ATTACKS[mini.attack].name}</h2></div><strong className={`countdown ${mini.seconds < 2 ? 'urgent' : ''}`}>{mini.seconds.toFixed(1)}<small>초</small></strong></div><div className="time-track"><div style={{ width: `${Math.max(0, mini.seconds / ATTACKS[mini.attack].seconds * 100)}%` }} /></div>
    <p className="mini-instruction">{ATTACKS[mini.attack].description}</p>
    {mini.attack === 'spoof' && <>{mini.referenceIp ? <p className="reference-ip">상대의 진짜 IP <strong>{mini.referenceIp}</strong></p> : <p className="mini-help">대결 화면에서 기억한 상대 IP를 선택하세요. 방어 중에는 IP가 가려집니다.</p>}<div className="mini-options">{mini.options.map((ip) => <button key={ip} disabled={busy} onClick={() => submit(ip)} className="ip-option">{ip}</button>)}</div></>}
    {mini.attack === 'ransom' && <><p className="mini-help">다음 파일: <strong>{mini.sequence[progress] || '완료'}</strong> · {progress} / {mini.sequence.length}</p><div className="letter-board">{mini.options.map((letter) => { const done = mini.sequence.indexOf(letter) < progress; return <button key={letter} className={`file-button ${done ? 'completed' : ''}`} disabled={done} onClick={() => submit(letter)}><span aria-hidden="true">▤</span>{letter}<small>{done ? '복구 완료' : '파일'}</small></button>; })}</div></>}
    {mini.attack === 'intercept' && <><p className="mini-help">상대가 고른 경로와 겹치면 실패합니다. 한 곳을 선택하세요.</p><div className="mini-options routes">{mini.options.map((n) => <button key={n} disabled={busy} onClick={() => submit(n)}><span>⌘</span>경로 {n + 1}</button>)}</div></>}
    {mini.attack === 'phishing' && <><Popup value={mini.reference} original /><div className="popup-grid">{mini.options.map((value, i) => <Popup key={i} value={value} index={i} onClick={() => submit(i)} disabled={busy} />)}</div><p className="mini-help">성공하면 원본에 표시된 보상을 받습니다. 꽝이면 아이템은 지급되지 않습니다.</p></>}
    {mini.attack === 'replay' && <><div className="arrow-sequence" aria-label="입력할 방향키">{mini.sequence.map((key, i) => <span key={i} className={i < progress ? 'completed' : i === progress ? 'current' : ''}>{ARROW_SYMBOL[key]}</span>)}</div><p className="mini-help">키보드 방향키로 순서대로 입력하세요. 입력 즉시 반영됩니다.</p><div className="arrow-controls">{ARROWS.map((key) => <button key={key} aria-label={key} onClick={() => submit(key)}>{ARROW_SYMBOL[key]}</button>)}</div></>}
  </section>;
}
