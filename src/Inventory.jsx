import React from 'react';

export default function Inventory({ room, disabled, action }) {
  return <section className="battle-panel items-panel"><p className="eyebrow">INVENTORY</p><h2>내 아이템</h2>
    {(room.mode === 'multi' || room.difficulty === 'tutorial') && <div className="inventory-item"><span>◎</span><div><strong>VPN <b>{room.me.items.vpn}</b></strong><small>원할 때 내 IP 변경 · 1개 소모</small></div><button disabled={disabled || room.me.items.vpn < 1} onClick={() => action({ type: 'vpn' })}>사용</button></div>}
    <div className="inventory-item"><span>▣</span><div><strong>방화벽 <b>{room.me.items.firewall}</b></strong><small>실패 1회 자동 만회</small></div><em>자동</em></div>
    {(room.mode === 'multi' || room.difficulty === 'tutorial') && <div className="inventory-item"><span>ϟ</span><div><strong>DDoS <b>{room.me.items.ddos}</b></strong><small>상대 다음 방어 난이도 +1</small></div><button disabled={disabled || room.me.items.ddos < 1} onClick={() => action({ type: 'ddos' })}>사용</button></div>}
    {room.me.boost > 0 && <p className="boost-warning">다음 방어에 난이도 +1 적용</p>}
    {room.mode === 'single' && <p className="mini-help">방화벽이 없으면 방어 실패마다 내 비밀번호가 1자리 노출됩니다. 4자리 모두 노출되면 패배합니다.</p>}
  </section>;
}
