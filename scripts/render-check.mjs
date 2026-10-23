import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { makePlayer, startGame, view, act } from '../server/game.js';
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { default: GameBoard, ResultScreen } = await vite.ssrLoadModule('/src/GameBoard.jsx');
  const { default: Tutorial } = await vite.ssrLoadModule('/src/Tutorial.jsx');
  const a = makePlayer('a', 'Player 1'), b = makePlayer('b', 'Player 2');
  a.secret = '0012'; b.secret = '3456';
  const room = { players: [a, b], mode: 'multi', difficulty: 'normal' };
  startGame(room, 1000); room.turn = 0;
  const html = renderToStaticMarkup(React.createElement(GameBoard, { room: view(room, a, 1100), send: () => {}, home: () => {} }));
  for (const text of ['별빛 보급 상자', '게임 진행 시간', '상대가 알아낸']) assert.ok(html.includes(text), text);
  assert.equal(html.includes('SYSTEM LOG'), false);
  const tutorial = renderToStaticMarkup(React.createElement(Tutorial, { onFinish: () => {}, onExit: () => {} }));
  assert.ok(tutorial.includes('TUTORIAL'));
  act(room, a, { type: 'attack', attack: 'spoof' }, 1100);
  const defense = renderToStaticMarkup(React.createElement(GameBoard, { room: view(room, b, 1200), send: () => {}, home: () => {} }));
  assert.equal(defense.includes('상대의 진짜 IP'), false);
  assert.ok(defense.includes('방어 중 숨김'));
  for (const winner of ['me', 'opponent']) {
    const result = renderToStaticMarkup(React.createElement(ResultScreen, { room: { ...view(room, a, 1300), winner }, home: () => {} }));
    assert.ok(result.includes(winner === 'me' ? 'VICTORY' : 'DEFEAT'));
  }
  room.mode = 'single'; room.stage = 'attack'; room.pending = null; room.turn = 0;
  const single = renderToStaticMarkup(React.createElement(GameBoard, { room: view(room, a, 1300), send: () => {}, home: () => {} }));
  assert.equal(single.includes('VPN'), false);
  assert.equal(single.includes('DDoS'), false);
  assert.ok(single.includes('4자리 모두 노출되면 패배'));
  console.log('PASS: 공격 화면, 노출도, 타이머, 상자, 튜토리얼, 스푸핑 IP 숨김, 승리/패배 화면 렌더링');
} finally { await vite.close(); }
