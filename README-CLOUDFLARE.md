# Cloudflare Pages용 운영 안내

## 현재 기준
이 저장소는 **GitHub + Cloudflare Pages** 기준으로 운영합니다.

- GitHub 저장소: 운영 정본(Source of Truth)
- Cloudflare Pages: 실제 배포/실행 환경
- 운영 주소:
  - 배송정보 입력: https://cocoro1.pages.dev/index.html
  - 접수 조회: https://cocoro1.pages.dev/status.html
  - 송장 반영(운영자): https://cocoro1.pages.dev/tracking.html

## 폴더 구조
- `public/` : 정적 HTML 파일
- `functions/api/*.js` : Cloudflare Pages Functions API
- `functions/_lib/security.js` : 공통 보안/응답 유틸
- `functions/_lib/notion-data-source.js` : Notion data source 식별 헬퍼
- `wrangler.jsonc` : Pages 설정

## 필수 환경변수
- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`
- `TRACKING_ADMIN_PASS`

## 선택 환경변수
- `NOTION_DATA_SOURCE_ID`
  - 비워두면 코드가 `NOTION_DATABASE_ID`로 database를 읽고 첫 번째 data source를 자동 탐색합니다.

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
- Variables and Secrets: 위 환경변수 등록
- Runtime compatibility: `wrangler.jsonc`의 `nodejs_compat` 사용

## 주의
- 메모리 Map 기반 rate limit은 best-effort 방식입니다.
- Notion SDK v5 기준으로 `dataSources.query()` / `data_source_id` 흐름을 사용합니다.
- 실제 Notion 연동 테스트는 Cloudflare 환경변수 설정 후 확인해야 합니다.
