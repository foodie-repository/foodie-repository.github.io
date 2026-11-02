# Neon Dash V2 — 2026-11-02 복구 개발

기존 `neon-dash/index.html`은 변경하지 않고 `neon-dash-v2/index.html`에 별도 버전을 배포했습니다.

## 기존 프로젝트 유지
- 1단계 Neon Start: 맵/귀신 연출/오디오/기존 AUTO 입력 기록과 지문 유지.
- 맵 편집기, 저장, 맵 코드, 기본 오디오, 난이도 선택, 장치 모드 유지.

## 기능형 블록
- 2단계 Pulse Factory: Bounce Block — 블록 위로 착지 시 자동 강한 반동.
- 3단계 Sky Circuit: Moving Block — 상하로 이동하는 발판, 착지 중 발판 이동량 반영.
- 4단계 Wave Storm: Electric Block — 일정 주기로 활성화되며 접촉 시 사망.
- 5단계 Final Eclipse: Collapse Block — 착지 후 0.32초부터 약 1.35초 붕괴.
- Wave: 누르고 있는 상태 기준 대신, 탭할 때마다 상승/하강 전환. AUTO는 과거 입력 기록의 상승/하강 상태를 그대로 재현하도록 변환.

## 장애물 및 난이도
- 원래 맵 내 블록-블록, 블록-가시, 포털-장애물 겹침 제거.
- AUTO 경로와 충분한 간격을 두고 추가 장애물을 배치한 고밀도 구성.
- 신규 추가 장애물(가시/비행): Pulse Factory 31/18, Sky Circuit 24/84, Wave Storm 18/83, Final Eclipse 19/101.
- 원래 데이터에서 서로 겹친 가시는 최종 버전에서 추가로 정리.

## AUTO
- 공식 2~5단계 기존 AUTO 입력 이벤트를 새로운 맵 구조에 맞게 지문 갱신 및 시뮬레이션 재검증.
- 고정 물리 스텝: 120 Hz.
- 최종 재검증: 2단계 tick 7353, 3단계 tick 8908, 4단계 tick 9531, 5단계 tick 11397에 완주.
- 1단계 원래 지문: `og1-3d76dfff` 유지.
- 기존 UI의 AUTO 입력 방식 유지 (비밀 코드 `뀨`).

## 제한과 확인 사항
- 코드 문법 검사 및 독립 물리 시뮬레이션 수행.
- 실제 모바일 브라우저(터치 입력, GPU 렌더링, 오디오 포함)의 종합 E2E 검증은 미실시.
- 기존 AUTO 입력 기록을 재사용하여 재검증했으며, 네 단계의 신규 수동 녹화본을 제작한 것은 아닙니다.
- 게임 공개 URL: https://foodie-repository.github.io/neon-dash-v2/
