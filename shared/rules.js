export const ATTACKS = {
  spoof: { name: '스푸핑', icon: '◎', description: '가짜 IP 사이에서 진짜 IP를 찾아야 합니다.', seconds: 5 },
  ransom: { name: '랜섬웨어', icon: '▦', description: '흩어진 알파벳을 A부터 순서대로 클릭합니다.', seconds: 7 },
  intercept: { name: '가로채기', icon: '⇄', description: '서로 다른 경로를 골라 가로채기를 피합니다.', seconds: 5 },
  phishing: { name: '피싱', icon: '◇', description: '원본과 완전히 같은 아이템 팝업을 찾습니다.', seconds: 5 },
  replay: { name: '재전송 공격', icon: '↻', description: '화면의 화살표를 보고 방향키를 순서대로 입력합니다.', seconds: 5 },
  brute: { name: '브루스 포스', icon: '⌁', description: '상대 비밀번호 4자리를 입력합니다. 연속 사용 가능합니다.' },
};
export const DIFFICULTIES = {
  easy: { name: '쉬움', every: 3, firewalls: 2, description: '방어 3회마다 힌트 · 방화벽 2개' },
  normal: { name: '보통', every: 4, firewalls: 1, description: '방어 4회마다 힌트 · 방화벽 1개' },
  hard: { name: '어려움', every: 6, firewalls: 0, description: '방어 6회마다 힌트 · 방화벽 없음' },
  challenge: { name: '챌린지', every: 0, firewalls: 0, description: '목숨 3개 · 방어 미니게임 클리어 기록' },
  tutorial: { name: '튜토리얼', every: 0, firewalls: 3, description: '제한 시간 없이 공격·아이템·방어 연습' },
};
export const validPassword = (value) => typeof value === 'string' && /^\d{4}$/.test(value);
export const interceptOptions = (level) => Math.max(2, 4 - level);
export const ARROWS = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
export const ARROW_SYMBOL = { ArrowUp: '↑', ArrowRight: '→', ArrowDown: '↓', ArrowLeft: '←' };
export const ITEM_NAMES = { ddos: 'DDoS', vpn: 'VPN', firewall: '방화벽', none: '꽝' };
export const ITEM_ODDS = { box: [['ddos', 35], ['vpn', 35], ['firewall', 20], ['none', 10]], phishing: [['ddos', 45], ['vpn', 45], ['firewall', 10]] };
export const SINGLE_ITEM_ODDS = [['none', 80], ['firewall', 20]];
export const TUTORIAL_DEFENSES = ['ransom', 'replay', 'intercept', 'phishing', 'spoof'];
