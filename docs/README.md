# COCORO1 문서(운영/유지보수)

이 폴더는 **COCORO SHOP 배송정보 입력 + 접수조회 + 송장반영(운영자용)** 시스템을  
누구나 이어서 운영/수정할 수 있도록 **설정값 / 구조 / 절차 / 변경이력**을 모아둔 곳입니다.

---

## 빠른 링크(운영 화면)

- 배송정보 입력(고객용): https://cocoro1.pages.dev/index.html
- 접수 조회(고객용): https://cocoro1.pages.dev/status.html
- 송장번호 자동 반영(운영자용): https://cocoro1.pages.dev/tracking.html
- 노션 DB(출고 접수 관리): (운영자가 직접 관리)

---

## 문서 구성(필수)

- **AI_BRIEF.md**  
  프로젝트 1장 요약(흐름 / 노션 속성 / 보안 / 운영 규칙)

- **CONFIG.md**  
  환경변수 + 성능/운영 관련 설정값(CHUNK, UPDATE_DELAY_MS, MAX_MISS_STATUS_CHECK 등)  
  + Cloudflare 운영 기준 / Notion SDK v5 대응 정리

- **FILES_MAP.md**  
  파일 역할 지도(무슨 파일이 무엇을 담당하는지)

- **RUNBOOK.md**  
  운영자가 실제로 쓰는 실행 절차(초보도 그대로 따라하는 단계별 가이드)

- **CHANGELOG.md**  
  변경 이력(언제 / 왜 / 무엇을 바꿨는지)

---

## 원칙(중요)

1) **정본(Source of Truth)은 GitHub `main`** 입니다.  
2) 토큰 / 비밀번호 / DB ID 같은 민감정보는 **문서에 절대 저장하지 않습니다.**  
   → **Cloudflare Pages → Variables and Secrets** 에만 저장합니다.
3) 코드 수정 시 반드시 `CHANGELOG.md`에 기록합니다.
4) Cloudflare 배포가 정상이어도, 대량 반영 전에는 샘플 2~3건을 먼저 점검합니다.
