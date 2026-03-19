# 수정 요약

## 문서 수정
- Vercel URL을 Cloudflare Pages 주소(`https://cocoro1.pages.dev/...`)로 교체
- 운영 기준을 `GitHub main + Cloudflare Pages`로 통일
- 민감정보 저장 위치를 `Cloudflare Pages > Variables and Secrets`로 수정
- Notion SDK v5 / data source 구조 설명 추가

## 코드 수정
- `functions/api/submit.js`
  - `database_id` 대신 `data_source_id`로 접수 생성하도록 수정
- `functions/api/recover.js`
  - `notion.dataSources.query()` 기준으로 접수번호 찾기 수정
- `functions/api/tracking-import.js`
  - `notion.dataSources.query()` 기준으로 송장 반영/조회 수정
- `functions/_lib/notion-data-source.js`
  - `NOTION_DATABASE_ID`에서 data source를 자동 탐색하는 헬퍼 유지

## 기타
- `README.md` 새로 추가
- `package.json`, `wrangler.jsonc` 이름을 `cocoro1-cloudflare` 기준으로 정리
