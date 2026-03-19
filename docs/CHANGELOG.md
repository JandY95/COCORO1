# CHANGELOG — 변경 이력

형식:
- 날짜(YYYY-MM-DD)
- 변경 이유(문제/요청)
- 변경 파일
- 변경 요약(핵심 1~3줄)
- 운영 영향(호출/성능/사용자 영향)

---

## 2026-03-19
- 변경 이유: Cloudflare 실운영 기준으로 문서/코드 정리, Notion SDK v5 data source 구조 반영
- 변경 파일: `README.md`, `README-CLOUDFLARE.md`, `docs/*.md`, `functions/_lib/notion-data-source.js`, `functions/api/submit.js`, `functions/api/recover.js`, `functions/api/tracking-import.js`
- 변경 요약:
  - 문서의 Vercel URL/설정을 Cloudflare Pages 기준으로 수정
  - GitHub `main` + Cloudflare Pages 운영 기준으로 문서 정리
  - Notion 조회/생성 로직을 data source 방식으로 통일
- 운영 영향:
  - 조회/접수/송장반영이 현재 Cloudflare 배포 구조와 일치
  - 기존 `NOTION_DATABASE_ID`는 유지 가능, 필요 시 `NOTION_DATA_SOURCE_ID` 추가 가능

## 2026-03-06
- 변경 이유: 문서/운영 이력 영구 보관용 docs 폴더 구성
- 변경 파일: docs/README.md, docs/AI_BRIEF.md, docs/CONFIG.md, docs/FILES_MAP.md, docs/RUNBOOK.md, docs/CHANGELOG.md
- 변경 요약: 운영/유지보수 문서 체계 추가
- 운영 영향: 없음
