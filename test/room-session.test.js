import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomSession } from '../src/room-session.js';

test('나가기 한 번으로 늦은 방 이벤트와 이전 요청 응답을 즉시 차단한다', () => {
  const session = createRoomSession();
  const token = session.begin();
  assert.equal(session.accepts(), true);
  session.close();
  assert.equal(session.accepts(), false);
  assert.equal(session.isCurrent(token), false);
  // A delayed room update must not restore the game after the home screen opens.
  let page = 'home';
  if (session.accepts()) page = 'game';
  assert.equal(page, 'home');
});

test('새 게임은 방 이벤트를 수락하지만 이전 게임의 응답은 계속 무효다', () => {
  const session = createRoomSession();
  const old = session.begin(); session.close();
  const current = session.begin();
  assert.equal(session.accepts(), true);
  assert.equal(session.isCurrent(old), false);
  assert.equal(session.isCurrent(current), true);
});
