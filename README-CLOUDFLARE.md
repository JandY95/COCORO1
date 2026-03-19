# Cloudflare Pages용 변환본 안내

## 폴더 구조
- `public/` : 정적 HTML 파일
- `functions/api/*.js` : Cloudflare Pages Functions API
- `functions/_lib/security.js` : 공통 보안/응답 유틸
- `wrangler.jsonc` : Pages 설정

## 필수 환경변수
- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`
- `TRACKING_ADMIN_PASS`

## 로컬 실행
```bash
npm install
npm run dev
```

## Cloudflare Pages 연결 시
- Framework preset: `None`
- Build command: 비워두기
- Build output directory: `public`
- Root directory: 저장소 루트
- Environment variables: 위 3개 추가
- Node.js compatibility: `wrangler.jsonc`의 `nodejs_compat` 사용

## 주의
- 메모리 Map 기반 rate limit은 best-effort 방식입니다.
- 실제 Notion 연동 테스트는 Cloudflare 환경변수 설정 후 확인해야 합니다.
