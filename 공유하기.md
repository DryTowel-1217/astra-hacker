# Astra Hacker를 카톡·노션으로 공유하기

이 프로젝트는 게임 화면과 Express·Socket.IO 서버를 함께 실행합니다.
인터넷 서버에 배포하면 친구들이 같은 주소로 접속해 방 코드를 입력할 수 있습니다.
현재 ZIP은 배포 준비 파일이며, 아직 인터넷 주소가 발급된 것은 아닙니다.

## 1. GitHub에 파일 올리기

1. https://github.com 에 로그인하고 새 저장소를 만듭니다. 이름 예: `astra-hacker`.
2. 받은 배포용 ZIP을 압축 해제합니다.
3. 저장소의 파일 업로드 기능(Add file → Upload files)으로 압축 해제한 파일과 폴더를 올립니다. 빈 저장소에서는 `uploading an existing file` 링크가 표시될 수 있습니다.
4. 변경 사항 저장(Commit changes)을 누릅니다.

저장소 첫 화면에서 `package.json`, `package-lock.json`, `render.yaml`, `index.html`, `src`, `server`, `shared`가 보여야 합니다. ZIP 자체를 올리거나 바깥 폴더를 한 겹 더 올리지 마세요. `node_modules`와 `dist`는 서버에서 다시 만들므로 배포용 ZIP에서 제외했습니다.

## 2. Render에서 인터넷 주소 만들기

1. https://dashboard.render.com 에 로그인합니다.
2. New + → Blueprint를 선택합니다.
3. GitHub 계정을 연결하고 방금 만든 저장소를 선택합니다. 비공개 저장소라면 Render에 해당 저장소 접근을 허용합니다.
4. `render.yaml`에서 읽어온 서비스가 무료(Free) 요금제인지 확인하고 생성·배포를 진행합니다.
5. 배포가 완료되면 서비스 화면의 `https://…onrender.com` 주소를 엽니다. 이것이 공유할 게임 주소입니다.

직접 Web Service로 생성할 경우 다음 설정을 사용합니다.

| 항목 | 값 |
| --- | --- |
| 서비스 유형 | Web Service |
| Runtime | Node |
| Root Directory | 비워 두기(package.json이 저장소 맨 위에 있을 때) |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free |
| 환경변수 NODE_VERSION | `22.16.0` |
| 환경변수 NODE_ENV | `production` |

서버가 필요한 게임이므로 Static Site 유형으로는 멀티플레이를 실행할 수 없습니다. PORT는 Render가 정하며, 현재 서버는 이를 자동으로 사용합니다. 게임 방은 서버 메모리에 저장되므로 서버는 인스턴스 한 개로 운영합니다.

## 3. 두 기기로 접속 확인하기

1. 첫 번째 기기에서 게임 주소를 열고 멀티 플레이 → 방 만들기를 선택합니다.
2. 두 번째 기기에서 같은 게임 주소를 열고 방 입장하기 → 첫 기기의 5자리 방 코드를 입력합니다.
3. 각자 게임용 비밀번호를 설정하고 준비한 뒤 방장이 게임을 시작합니다.
4. 싱글 플레이도 시작해 화면과 서버가 모두 정상 동작하는지 확인합니다.

공개 서버에 배포한 뒤에는 같은 와이파이에 연결할 필요가 없습니다. 현재 화면은 노트북 사용을 중심으로 만들어졌으므로 휴대폰에서도 직접 확인하세요. 카톡 안의 브라우저에서 조작에 문제가 있으면 메뉴에서 외부 브라우저로 열어 보세요.

## 4. 카톡·노션에 공유하기

- 카톡 단톡방: 발급받은 게임 주소를 붙여넣어 보냅니다. 멀티플레이할 상대에게 방 코드도 알려줍니다.
- 노션: 페이지에 게임 주소를 붙여넣고 링크 또는 북마크로 넣습니다. `/embed`로 화면을 넣어볼 수도 있지만 실제 표시 여부를 확인하세요. 노션에 게임 파일을 첨부하는 것만으로 서버가 실행되지는 않습니다.
- `localhost:3000`과 `192.168.…` 주소는 인터넷 공개 주소가 아닙니다. 공유할 때는 Render의 HTTPS 주소를 사용합니다.

## 운영 시 알아둘 점

- Render 무료 웹 서비스는 15분 동안 들어오는 HTTP 요청이나 WebSocket 메시지가 없으면 절전 상태가 될 수 있습니다. 다시 열 때 약 1분이 걸릴 수 있어 축제 시작 전에 미리 접속해 확인하세요.
- 방과 게임 기록은 서버 재시작·재배포 시 초기화됩니다. 현재 구현에서는 참가자의 연결이 끊겨도 방이 종료됩니다.
- 무료 요금제에도 사용량 제한이 있습니다. 축제에서 많은 사람이 동시에 사용할 예정이라면 사전에 여러 기기로 접속을 확인하고 요금제와 한도를 살펴보세요. 동시 수용 인원은 아직 측정하지 않았습니다.

## 공식 안내

- Express 배포: https://render.com/docs/deploy-node-express-app
- 설정 파일: https://render.com/docs/blueprint-spec
- 무료 요금제: https://render.com/docs/free
- 노션 링크·임베드: https://www.notion.com/help/embed-and-connect-other-apps
