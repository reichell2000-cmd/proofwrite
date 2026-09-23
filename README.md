# ProofWrite

**결과물을 검사하지 않습니다. 만들어지는 과정을 증명합니다.**

ProofWrite FREE v0.1은 AI 시대의 과제·수행평가를 위한 온라인 작성과정 증명 도구입니다.

## v0.1 핵심
- 온라인 과제 작성 Editor
- Evidence Collector (입력/삭제/수정/Paste/세션/창 이탈/버전)
- Thought Trace — 생각의 흔적
- My Proof prototype — 작성 리듬 연속성 신호
- Proof Score — 과정증거 종합지표 (부정행위 확률이 아님)
- Writing Timeline / Replay
- Teacher Reading Guide — 교사가 반드시 읽어볼 대목 추천
- 학생의 ‘선생님께 꼭 보여주고 싶은 대목’
- FREE core와 향후 AI/PRO 기능 분리를 위한 Feature Flags

## 제품 원칙
1. AI 사용 여부를 확률로 단정하지 않는다.
2. 관찰된 사실과 작성과정 증거를 보여주고 최종 판단은 교사에게 둔다.
3. Proof Score는 본인 작성 확률이 아니라 기록된 과정증거의 충분성이다.
4. AI는 교사를 대신해 학생을 평가하는 것이 아니라 교사가 어디를 봐야 하는지 돕는다.
5. ProofWrite 편집기 밖의 키 입력을 수집하지 않는다.
6. FREE core는 API 비의존형을 우선한다.

## 개발 순서
1. 데이터/Event schema
2. Web Editor
3. Evidence Collector
4. Thought Trace
5. Proof Score
6. Timeline / Replay
7. Teacher Dashboard + Reading Guide
8. My Proof prototype 검증
9. Pilot QA
