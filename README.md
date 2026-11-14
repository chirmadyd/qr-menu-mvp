# 메뉴링크

Next.js 기반 다국어 QR 메뉴판 MVP입니다. 편집과 이미지 합성은 브라우저에서 수행합니다. 서버는 Google OCR·번역 호출과 발행된 메뉴판 저장을 담당합니다.

## 실행

Node.js 20.9 이상이 필요합니다.

```powershell
npm.cmd install
npm.cmd run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 기본 샘플에서 영어·일본어·중국어 미리보기, 영역 수정, QR 발행을 바로 시험할 수 있습니다. 이미지 파일을 직접 올린 경우에도 영역과 번역문을 직접 입력할 수 있습니다.

## Google API 연결

Google Cloud 프로젝트에서 결제를 연결하고 Cloud Vision API와 Cloud Translation API를 사용 설정합니다. `.env.example`을 `.env.local`로 복사한 뒤 두 API를 호출할 수 있는 서버용 키를 `GOOGLE_CLOUD_API_KEY`에 넣고 개발 서버를 다시 시작합니다. 메뉴판을 올린 뒤 **글자 읽기 → 자동 번역**을 사용합니다. OCR 영역이 제목이나 설명을 포함하면 공개 전에 해당 영역을 삭제하거나 수정합니다.

## GitHub Pages에 편집기 배포

`npm run build:pages`는 편집 화면을 `out/`에 내보냅니다. 기본 경로는 현재 저장소의 `/qr-menu-mvp`입니다. GitHub Actions에서는 Pages가 알려준 경로를 사용합니다.

1. GitHub 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
2. 변경사항을 `main`에 푸시하거나 **Actions → Deploy editor to GitHub Pages → Run workflow**를 실행합니다.
3. 배포가 완료되면 [메뉴 편집기](https://chirmadyd.github.io/qr-menu-mvp/)를 엽니다.

Pages만으로 이미지 업로드, 수동 번역 편집과 미리보기를 이용할 수 있습니다. 자동 OCR·번역, QR 발행과 발행된 메뉴 조회에는 별도 Next.js 서버가 필요합니다. QR은 그 서버의 공개 메뉴 주소를 담습니다.

- 서버는 `npm run build`와 `npm start`로 HTTPS 호스트에서 실행하고 `GOOGLE_CLOUD_API_KEY`, `PUBLIC_MENU_ORIGIN`(서버의 공개 HTTPS 주소), `PAGES_EDITOR_ORIGIN`(예: `https://chirmadyd.github.io`)을 설정합니다. 발행된 메뉴를 유지하려면 작업 폴더의 `.data/menus`를 영속 디스크에 보관합니다.
- GitHub의 **Settings → Secrets and variables → Actions → Variables**에 `NEXT_PUBLIC_MENU_API_ORIGIN`을 서버의 HTTPS 주소로 등록하고 Pages 워크플로를 다시 실행합니다. 이 변수는 공개 주소입니다. Google API 키는 서버에만 설정합니다.
- 편집기 origin 설정은 브라우저 CORS를 위한 설정입니다. Google 과금과 저장소를 보호하려면 공개 서버에 인증과 호출 제한을 구성해야 합니다.

## 휴대폰으로 QR 확인

같은 네트워크에서 테스트할 때는 `PUBLIC_MENU_ORIGIN`에 휴대폰에서 접근 가능한 서버 주소(예: `http://192.168.0.10:3000`)를 설정합니다. `npm.cmd run dev -- --hostname 0.0.0.0`으로 서버를 실행하고, 휴대폰에서 해당 주소에 접속할 수 있는지 확인한 뒤 QR을 생성합니다. 네트워크 외부에서 접속하려면 HTTPS로 접근 가능한 호스트가 필요합니다.

## MVP 범위

- JPG, PNG, WebP 이미지 1장, 최대 8MB를 받습니다. 긴 변이 2560px을 넘으면 줄인 뒤, 같은 해상도를 OCR·편집·공개에 사용합니다.
- Canvas에서 원문 글자 픽셀을 주변 배경색으로 복원한 뒤 번역문을 그립니다. 사진이나 무늬에서 결과가 고르지 않으면 영역을 좁히거나 **원문 처리 → 배경색으로 가리기**를 선택해 색상과 투명도를 조정할 수 있습니다.
- 발행할 때마다 새 URL을 생성하고 결과 WebP와 메뉴 정보를 `.data/menus`에 저장합니다. 결과를 보존하려면 영속 디스크가 필요합니다.
- 매장 관리자 인증, API 호출 제한, 메뉴 삭제·갱신 기능은 로컬 시범 범위에서 제외했습니다. 공개 운영 전에는 편집·발행 API를 보호하고 영속 저장소를 구성해야 합니다.
