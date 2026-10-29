// Leaving closes the event gate immediately, before the server processes leaveRoom.
// Replies from a previous session cannot reopen a game or overwrite the home screen.
export function createRoomSession() {
  let active = false, version = 0;
  return {
    begin() { active = true; return ++version; },
    close() { active = false; version++; },
    accepts() { return active; },
    current() { return version; },
    isCurrent(token) { return token === version; },
  };
}
