# 최신 게임을 기존 Render 서비스에 반영하기

바탕화면 ITfest의 최신 게임에 기존 Render 설정(render.yaml)을 추가한 배포 준비본입니다. 게임 코드는 변경하지 않았습니다. node_modules와 dist는 ZIP에 넣지 않았으며 Render가 다시 생성합니다.

1. GitHub의 DryTowel-1217/astra-hacker에서 Code → Download ZIP으로 기존 버전을 백업합니다.
2. 이 ZIP의 압축을 풀고, GitHub 저장소 첫 화면에서 Add file → Upload files를 선택합니다.
3. 압축 푼 폴더 안의 파일과 폴더를 전부 끌어다 놓습니다. 바깥 폴더나 ZIP 자체를 올리지 않습니다. package.json과 render.yaml이 저장소 맨 위에 있어야 합니다.
4. Commit changes로 저장합니다. 기존 공유하기.md는 그대로 두어도 됩니다.
5. Render의 astra-hacker → Deploys에서 새 변경 사항이 배포되는지 확인합니다. 자동 배포가 꺼져 있으면 Manual Deploy → Deploy latest commit을 사용합니다.
6. 새 배포가 Live가 되면 https://astra-hacker.onrender.com 을 새로고침해 확인합니다. 게임 주소는 그대로입니다.

배포 설정은 기존과 동일합니다: 무료 Node 웹 서비스, 설치·빌드 npm ci --include=dev && npm run build, 실행 npm start, 상태 확인 /api/health. Render 계정의 실제 요금제·자동 배포 설정은 별도로 확인하세요.

로컬 검증: 규칙 테스트 23개, 배포용 빌드, 주요 화면 렌더링 검사, 멀티플레이 통신 검사, 프로덕션 페이지·상태 확인 응답 통과. 실제 인터넷 재배포와 브라우저 조작 검사는 업로드 후 확인해야 합니다.

현재 게임은 서버 재배포 시 진행 중인 방이 초기화됩니다. 플레이가 끝난 뒤 업데이트하세요.
