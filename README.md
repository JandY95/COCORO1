# COCORO1 — COCORO SHOP 배송/접수/송장 시스템

이 저장소는 **GitHub + Cloudflare Pages** 기준으로 운영하는  
COCORO SHOP 배송정보 입력 / 접수 조회 / 송장 반영 시스템입니다.

## 운영 링크
- 배송정보 입력: https://cocoro1.pages.dev/index.html
- 접수 조회: https://cocoro1.pages.dev/status.html
- 송장 반영(운영자): https://cocoro1.pages.dev/tracking.html

## 운영 기준
- **정본(Source of Truth)**: GitHub `main`
- **배포 대상**: Cloudflare Pages
- **민감정보 저장 위치**: Cloudflare Pages → Settings → Variables and Secrets

## 필수 환경변수
- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`
- `TRACKING_ADMIN_PASS`

## 선택 환경변수
- `NOTION_DATA_SOURCE_ID`
  - 비워두면 코드가 `NOTION_DATABASE_ID`에서 data source를 자동 탐색합니다.

## 문서
상세 운영 문서는 `docs/` 폴더를 보면 됩니다.
