# 기존 astra-hacker 업데이트

이 ZIP은 바탕화면 ITfest 최신본에 Render 배포 설정을 추가한 것입니다. 원본 게임 코드는 변경하지 않았습니다. node_modules와 dist는 제외했습니다.

1. 기존 GitHub 저장소에서 Code → Download ZIP으로 백업합니다.
2. 이 배포용 ZIP을 압축 해제합니다.
3. 압축 해제한 폴더를 엽니다. src, server, shared, scripts, test, package.json, render.yaml 등이 보이는 위치여야 합니다.
4. GitHub astra-hacker 저장소 첫 화면에서 Add file → Upload files를 선택합니다.
5. 3번 화면의 내용물 전체를 선택해서 끌어다 놓습니다. 내용물을 담은 바깥 폴더 자체를 올리지 마세요.
6. 업로드 목록에서 src/App.jsx, server/index.js, package.json처럼 경로가 바로 시작하는지 확인합니다. ITfest2/src/App.jsx 또는 ITfest-Render-업데이트/src/App.jsx처럼 시작하면 취소하고 바깥 폴더 안의 내용물을 다시 올립니다.
7. Commit changes를 누릅니다. GitHub 첫 화면에서 src, server 등의 수정 시각이 최근으로 바뀌었는지 확인합니다.
8. Render에서 새 변경 사항의 배포가 Live인지 확인한 다음 기존 게임 주소 https://astra-hacker.onrender.com 을 새로고침합니다. Live만으로 업로드 경로가 올바르다는 뜻은 아니므로 6~7번을 꼭 확인합니다.

기존 저장소에 잘못 올라간 ITfest2 폴더는 별도 삭제할 수 있습니다. 파일 업로드만으로 기존의 불필요한 파일이 자동 삭제되지는 않습니다. 기존 render.yaml은 이번 ZIP의 같은 이름 파일로 교체해도 됩니다. 기존 공유하기.md 등 안내 파일은 남아 있어도 실행에는 영향을 주지 않습니다.

배포 설정: 무료 Node 웹 서비스 / Node 22.16.0 / 빌드 npm ci --include=dev && npm run build / 실행 npm start / 상태 확인 /api/health.

서버를 재배포하면 진행 중인 게임 방이 초기화됩니다.
