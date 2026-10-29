import React, { useState } from 'react';
import { Popup } from './MiniGame.jsx';

const steps = [
  { title: '별을 지키는 방법', subtitle: '내 공격에는 정보를 얻고, 상대 공격에는 미니게임으로 방어하세요.', note: '상대가 방어에 실패하면 비밀번호를 앞자리부터 한 칸씩 알아냅니다. 공격 차례에 4자리 정답을 입력하면 승리!' },
  { title: '스푸핑 · 상대 IP를 기억하세요', subtitle: '상대 IP를 대결 화면에서 미리 기억해야 해요.', note: '예시 IP는 372입니다. 아래에서 372를 눌러보세요. 실제 방어 중에는 싱글·멀티 모두 정답 IP가 가려집니다. 제한 시간 5초.' },
  { title: '랜섬웨어 · 파일을 순서대로 복구', subtitle: '파일 위치가 섞여 있어도 A → B → C 순서로 클릭하세요.', note: '7초 안에 모든 파일을 클릭하면 성공. 잘못된 파일을 누르면 실패합니다. 파일은 클릭 즉시 반응해요.' },
  { title: '가로채기 · 다른 경로로 피하세요', subtitle: '상대는 공격 전에 경로를 하나 골라 숨어 있어요.', note: '5초 안에 경로 하나를 선택하세요. 상대의 선택과 겹치면 실패, 다르면 성공. 경로는 난이도에 따라 4개에서 2개까지 줄어요.' },
  { title: '피싱 · 원본과 같은 팝업 찾기', subtitle: '글자, 문양, 별 개수를 꼼꼼하게 비교하세요.', note: '5초 안에 원본과 완전히 같은 팝업을 선택하면 성공. 표시된 아이템 1개를 얻어요. DDoS 45% · VPN 45% · 방화벽 10%.' },
  { title: '재전송 공격 · 방향키 입력', subtitle: '화면의 화살표를 왼쪽부터 순서대로 입력하세요.', note: '예시: ↑ → ↓ ← ↑. 실제 게임에서는 키보드 방향키 또는 화면 버튼을 사용해요. 5초 안에 끝내야 하며 잘못 누르면 실패합니다.' },
  { title: '브루스 포스 · 정답으로 승리', subtitle: '내 공격 차례에 상대 비밀번호 4자리를 입력하세요.', note: '정답이면 즉시 승리! 브루스 포스는 재사용 제한이 없어요. 다른 공격은 사용 후 다음 내 공격 차례 2회 동안 잠깁니다.' },
  { title: '아이템과 별빛 보급 상자', subtitle: '공격 대신 보급 상자를 열면 내 공격 차례를 소비합니다.', note: '상자: DDoS 35% · VPN 35% · 방화벽 20% · 꽝 10%. 멀티 상자는 사용 후 다음 내 공격 차례 2회 동안 잠깁니다. VPN과 DDoS는 직접 사용하고 방화벽만 자동 사용해요. 3턴마다 난이도만 상승하며 아이템은 자동 지급되지 않아요.' },
  { title: '이제 준비됐나요?', subtitle: '공격 선택은 10초. 내 비밀번호 노출도도 확인하세요.', note: '멀티에서 시간이 지나면 가능한 보안 공격 중 하나가 자동 선택됩니다. 싱글은 비밀번호 입력/건너뛰기 중 무작위로 진행돼요. 상자 열기는 직접 선택하세요.' },
];
export default function Tutorial({ onFinish, onExit, busy, mode = 'multi', difficulty }) {
  const [step, setStep] = useState(0), [feedback, setFeedback] = useState(''), [file, setFile] = useState(0);
  const single = mode === 'single';
  const data = { ...steps[step] }, original = { title: '아이템 획득', item: single ? difficulty === 'challenge' ? '꽝' : '방화벽' : 'VPN', stars: 3, seal: '✦' };
  if (single && step === 0) data.note = difficulty === 'challenge' ? '챌린지는 목숨 3개로 방어만 계속합니다. 방화벽이 없으면 실패 시 목숨이 줄어요.' : '방화벽이 있으면 실패할 때 1개를 소모합니다. 없으면 내 비밀번호가 1자리씩 드러나고, 4자리 모두 드러나면 패배해요. 상대 비밀번호를 먼저 맞히면 승리!';
  if (single && step === 4) data.note = '5초 안에 원본과 같은 팝업을 고르세요. 싱글 보상은 꽝 80% · 방화벽 20%입니다. 꽝이면 방어에 성공해도 아이템은 없어요.';
  if (single && step === 7) data.note = '싱글 보급 상자와 피싱 보상은 꽝 80% · 방화벽 20%입니다. VPN과 DDoS는 나오지 않아요. 방화벽은 실패 시 자동 사용합니다. 상자는 공격 차례를 소비해요.';
  if (single && difficulty === 'challenge' && step === 4) data.note = '원본과 완전히 같은 팝업을 찾으세요. 챌린지 피싱은 100% 꽝이므로 성공해도 아이템은 나오지 않습니다. 성공하면 클리어 수가 올라가요.';
  if (single && difficulty === 'challenge' && step === 7) data.note = '챌린지에서는 피싱도 100% 꽝이며 아이템을 얻지 않습니다. 목숨 3개로 방어를 이어가며 클리어 수에 도전하세요.';
  function move(next) { setStep(next); setFeedback(''); setFile(0); }
  return <div className="modal-scrim tutorial-scrim"><section className="tutorial-modal" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
    <div className="tutorial-meta"><span>ASTRA HACKER / TUTORIAL</span><strong>{step + 1} / {steps.length}</strong></div><div className="tutorial-progress">{steps.map((_, i) => <i key={i} className={i <= step ? 'done' : ''} />)}</div>
    <h2 id="tutorial-title">{data.title}</h2><p className="tutorial-subtitle">{data.subtitle}</p>
    <div className="tutorial-demo">
      {step === 0 && <div className="tutorial-flow"><span>① 공격 선택</span><b>→</b><span>② 상대 미니게임</span><b>→</b><span>③ 공수 교대</span><div className="demo-password">3 <span>?</span> <span>?</span> <span>?</span></div></div>}
      {step === 1 && <div className="tutorial-ips">{['572', '372', '327'].map((ip) => <button key={ip} onClick={() => setFeedback(ip === '372' ? '성공! 진짜 상대 IP를 찾았어요.' : '가짜 IP예요. 372를 찾아보세요.')}>{ip}</button>)}</div>}
      {step === 2 && <div className="letter-board">{['C', 'A', 'B'].map((letter) => <button className={letter.charCodeAt(0) - 65 < file ? 'completed' : ''} disabled={letter.charCodeAt(0) - 65 < file} key={letter} onClick={() => { if (letter === 'ABC'[file]) { setFile(file + 1); setFeedback(file === 2 ? '모든 파일을 복구했어요!' : `다음은 ${'ABC'[file + 1]}예요.`); } else setFeedback(`지금은 ${'ABC'[file]} 파일을 눌러주세요.`); }}>{letter}</button>)}</div>}
      {step === 3 && <div className="tutorial-ips">{[1, 2, 3, 4].map((n) => <button key={n} onClick={() => setFeedback(n === 2 ? '예시 상대는 경로 2에 있었어요. 다른 경로로 피하세요!' : '경로 2의 가로채기를 피했어요!')}>경로 {n}</button>)}</div>}
      {step === 4 && <div className="tutorial-popups"><Popup value={original} original /><div className="popup-grid"><Popup value={{ ...original, stars: 4 }} index={0} onClick={() => setFeedback('별이 하나 더 있어요. 가짜 팝업입니다.')} /><Popup value={original} index={1} onClick={() => setFeedback(original.item === '꽝' ? '정답! 챌린지는 꽝이므로 아이템 없이 클리어 수만 올라가요.' : `정답! 이 팝업에서는 ${original.item} 1개를 얻어요.`)} /></div></div>}
      {step === 5 && <div className="arrow-sequence">{['↑', '→', '↓', '←', '↑'].map((arrow, i) => <span key={i}>{arrow}</span>)}</div>}
      {step === 6 && <div className="demo-password">3 7 2 9 <small>4자리 정답 → VICTORY</small></div>}
      {step === 7 && <div className="tutorial-item-list">{single && difficulty === 'challenge' ? <span>100% 꽝<small>챌린지는 아이템 없이 목숨 3개로 도전</small></span> : <>{!single && <span>◎ VPN <small>사용 버튼으로 내 IP 변경</small></span>}<span>▣ 방화벽 <small>실패 1회 자동 만회</small></span>{!single && <span>ϟ DDoS <small>다음 미니게임 난이도 +1</small></span>}</>}</div>}
      {step === 8 && <div className="tutorial-ready">✦<strong>당신의 별을 지켜내세요.</strong></div>}
    </div><p className="tutorial-feedback" aria-live="polite">{feedback || '예시 화면 · 제한 시간 없음'}</p><p className="tutorial-note">{data.note}</p>
    <div className="tutorial-actions"><button className="quiet-button" onClick={() => step ? move(step - 1) : onExit()}>{step ? '← 이전' : '시작 화면으로'}</button><div className="tutorial-action-right"><button className="quiet-button" disabled={busy} onClick={onFinish}>튜토리얼 건너뛰기</button>{step < steps.length - 1 ? <button className="gold-button" onClick={() => move(step + 1)}>다음 →</button> : <button className="gold-button" disabled={busy} onClick={onFinish}>이해했어요 · 준비 완료</button>}</div></div>
  </section></div>;
}
