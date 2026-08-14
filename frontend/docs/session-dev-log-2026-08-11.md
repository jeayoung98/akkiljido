# 아낄지도 — 세션 개발 로그 (2026-08-11)

이 문서는 **이 Claude Code 대화 하나**를 근거로 작성한 개발 일지다. 프로젝트 전체 커밋 히스토리를 훑은 "아낄지도 — 기술 회고 & 면접 대비 자료"(이하 **회고 문서**)와 겹치는 내용(카카오맵 WebView 흰 화면 근본 원인, SHA-1, EAS 환경변수, 헤드리스 위치 태스크 구조, 알림 중복 방지 등)은 이미 그쪽에 정리돼 있으므로 여기서는 반복하지 않고, **이 대화에서 실제로 일어난 것**만 시간순으로 복원한다. 회고 문서에 없던 내용(깃 충돌 해결 과정, 백엔드 QueryDSL 문제, EAS 빌드 쿼터 소진, google-services.json 배포 전환, 지도 반경 커스터마이징, 리포트 화면 추천 재사용 등)을 중심으로 다룬다.

---

## 1. 작업 타임라인

실제 진행 순서(회고 문서에 이미 있는 카카오맵/키보드/헤더 근본 수정 자체는 ①~③으로 짧게만 표시하고, 이후부터 상세히 기록한다):

| # | 작업 | 목적 |
|---|---|---|
| ① | 카카오맵 WebView 흰 화면 진단·수정 (baseUrl https, autoload=false) | *회고 문서 트러블슈팅 1번과 동일 — 상세는 그쪽 참고* |
| ② | `AppScreen`의 Android 키보드 이중 리사이즈 버그 수정 | *회고 문서 21번과 관련 — 이 세션에서 발견한 구체적 원인은 4장에 별도 기록* |
| ③ | 지도 화면 검색 결과에 MapPickerScreen과 동일한 카드 목록 UI 도입 | 지도 탭에서 검색해도 아무 목록이 안 뜨던 문제 해결 |
| ④ | 지도 아코디언 카드 상세 내역에 **시간** 컬럼 추가 | 날짜/금액만 있던 상세 내역에 실제 거래 시각 표시 |
| ⑤ | 지도 화면 검색 Bottom Sheet를 "내 장소" Bottom Sheet와 상호 배타적으로 재구성 | 두 시트가 겹쳐 보이는 문제 해결, X 닫기 버튼 추가 |
| ⑥ | `내역`/`리스트·캘린더·분석` 헤더 고정 패턴을 과거 리포트 화면 방식으로 통일 | 스크롤해도 헤더가 사라지지 않게 |
| ⑦ | "추천 위치" → "방앗간" 용어 통일 (화면 텍스트 5곳 + 추가로 발견된 1곳) | 브랜딩 용어 일관성 |
| ⑧ | 전체 코드 점검(우선순위 낮은 항목 제외) → 홈 화면 닉네임 하드코딩, 리포트 팝업 전체 목업 상태 발견 | 기능 완성도 점검 |
| ⑨ | 리포트 화면의 방앗간 추천 UI/동작을 홈 화면 추천 모달과 동일하게 통합 | 두 화면 간 디자인·동작 불일치 해소 |
| ⑩ | 앱 이름/아이콘 브랜딩 상태 확인 (이미 적용돼 있음을 검증) | QR 다운로드 화면 브랜딩 확인 |
| ⑪ | Google Sign-In용 `google-services.json` 반영 — `.gitignore` 등록 → `app.json`→`app.config.js` 전환 → EAS 시크릿 등록 | 클라우드 빌드에서도 파일이 인식되게 |
| ⑫ | EAS 클라우드 빌드 무료 쿼터 소진 발견 → 로컬 Gradle 빌드로 전환 | 빌드 파이프라인 대체 확보 |
| ⑬ | 로컬 release APK를 `C:\Users\SSAFY\AkkilMapAPK`에 반복 생성 | 시연/QR 공유용 산출물 확보 |
| ⑭ | 지도 500m 반경 시연 페이지(`app/test.tsx`) 제작 + `KakaoMap`에 반경/색상 prop 추가 | 시연 화면에서 2km 대신 500m 원, 빨간색으로 확인 |
| ⑮ | `git merge`/`cherry-pick` 충돌을 **총 4차례**(MapPickerScreen.tsx, MapScreen.tsx ×2, ListScreen.tsx) 해결 | 브랜치 작업 중 반복적으로 발생한 충돌 정리 |
| ⑯ | 백엔드 QueryDSL Q클래스 미생성으로 인한 import 빨간 줄 진단·해결 | 백엔드 IDE 오류 해결 |
| ⑰ | `frontend/apk` 브랜치 → `frontend/main` 브랜치 전환 후 재빌드 | 사용자가 다른 브랜치로 작업 전환 |
| ⑱ | `app.apk`(109MB) 실수 커밋 정리, `.gitignore` 보강, 오타 브랜치(`frontned/apk`) 삭제 | 저장소 위생 관리 |

---

## 2. 기능 구현

### 새로 구현한 기능
- **지도 아코디언 상세 내역에 시간 표시** — 날짜/금액만 보이던 걸 날짜/시간/금액 3열로 확장.
- **지도 화면 검색 결과 카드 목록** — 검색해도 첫 번째 결과로 조용히 지도만 이동하던 것을, MapPickerScreen과 동일한 "카드 목록 + 지도 핀 + 선택" UX로 확장.
- **500m 반경 시연 페이지** (`app/test.tsx`) — "내 장소" 반경 원(2km)의 500m 버전을 색상까지 바꿔 보여주는 개발용 전용 화면. `.gitignore`에 이미 등록된 스크래치 경로를 재활용.
- **`KakaoMap`의 반경·색상 커스터마이징 API** — `myPlaceCircleRadius`, `myPlaceCircleColor` prop을 새로 노출(둘 다 생략 시 기존 서비스 값 그대로 — 기존 화면 무영향).

### 수정한 기능
- **지도 화면 "내 장소" Bottom Sheet ↔ 검색 결과 패널 상호작용** — 검색 시작 시 "내 장소" 시트를 `visible={false}`로 내리고, 검색 패널을 닫으면(X 버튼) 다시 올라오도록 상태를 하나로 묶음.
- **리포트 화면의 방앗간 추천 목록** — 클릭해도 아무 반응이 없던 것을, 홈 화면과 동일하게 `SaveAlarmModal`이 열리고 실제로 저장되도록 연결.
- **`TransactionEditScreen`** — `AppScreen`에 `scrollable`을 추가해, 메모 등 하단 입력 필드가 키보드에 가려지지 않게 함.
- **`NotificationScreen`의 위치 알림 라벨** — `'위치 알림'` → `'방앗간 알림'`.

### 리팩토링한 부분
- **`RecommendationRow` 컴포넌트 추출** (`components/report/RecommendModal.tsx`) — 홈 화면 추천 모달 안에 있던 "번호 + 설명 + `+`아이콘" 한 줄 UI를 별도 컴포넌트로 뽑아, 리포트 화면도 동일 컴포넌트를 재사용하도록 변경. 부수적으로 번호를 감싸는 초록 원 스타일 추가.
- **`useSaveRecommendedAlarm` 훅 추출** (`hooks/useSaveRecommendedAlarm.ts`, 신규 파일) — 홈 화면에만 있던 "추천 알림을 실제로 저장(POST + 로컬 알림 장소 목록 동기화)" 로직을 훅으로 분리해, 홈 화면과 리포트 화면이 동일한 저장 로직을 공유하도록 변경. 홈 화면 쪽 코드는 로직 삭제 후 훅 호출 한 줄로 대체(순수 이동, 로직 변경 없음).
- **`ListScreen`의 헤더/스크롤 구조** — `AppScreen`의 내장 `scrollable`(헤더까지 통째로 스크롤됨)을 걷어내고, 과거 리포트 화면과 같은 패턴(헤더를 스크롤 영역 밖에 형제로 배치 + 별도 `ScrollView`)으로 교체.
- **`app.json` → `app.config.js`** — 정적 JSON을 JS 모듈로 전환, `googleServicesFile` 경로를 `process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'`로 동적 분기.

### UI 변경 사항
- 지도 아코디언 상세 행: 날짜·금액 2열 → 날짜·시간·금액 3열.
- 지도 검색 결과 카드에 X 닫기 버튼 추가(결과 있음/없음 두 케이스 모두).
- 리포트 화면 추천 항목: 번호 텍스트만 있던 것 → 초록 원 안 번호 + `+` 아이콘.
- `내역`/`리스트·캘린더·분석` 헤더가 스크롤 중에도 항상 상단에 고정.
- 500m 시연 화면: "내 장소" 표시 색을 파란색 → 빨간색(`Colors.light.danger`)으로.

### API 연동
- 리포트 화면에 `POST /api/v1/notification`(방앗간 알림 등록) 연동 — 기존에 홈 화면에만 있던 연동을 훅 공유로 확장 적용.

### 권한 처리
- 이번 세션에서 새로 다룬 권한 이슈는 없음(회고 문서의 위치/알림 권한 작업은 이전 세션 범위).

### 아키텍처 변경
- **Expo 설정 파일 체계 전환**: 정적 `app.json` 단일 소스 → `app.config.js`(동적 JS) 중심, `app.json`은 잔존하지만 우선순위상 무시됨.
- **빌드 파이프라인 이원화**: EAS 클라우드 빌드(쿼터 소진으로 막힘) → 로컬 Gradle(`./gradlew assembleRelease`) 직접 빌드로 임시 전환, 산출물을 프로젝트 밖 폴더(`AkkilMapAPK`)로 복사하는 수동 배포 경로 확립.

---

## 3. 트러블슈팅

### 3-1. 지도 화면 검색 시 Bottom Sheet 두 개가 겹쳐 보임
- **문제**: "내 장소" Bottom Sheet가 떠 있는 상태로 검색하면, 검색 결과가 그 위에 별도 레이어로 얹혀 두 시트가 동시에 보였다.
- **원인**: 검색 결과 패널을 추가할 때 기존 "내 장소" `BottomSheet`의 `visible` 조건을 건드리지 않고 그 위에 얹기만 했다.
- **시도한 해결 방법**: `BottomSheet`의 `visible` prop을 `!roadviewOpen && !hasSearchResults`로 확장해 검색 중엔 내려가게 함. 검색 패널 위치 계산도 `sheetVisibleHeight` 오프셋 대신 MapPickerScreen과 동일한 `keyboardHeight` 기반으로 교체.
- **실패한 시도**: 없음 — 원인이 명확해 한 번에 해결.
- **최종 해결 방법**: 상호 배타적 `visible` 상태 + `handleCloseSearchResults`로 검색 상태 전체(검색어·결과·강조 인덱스) 초기화.
- **결과**: 검색 중엔 시트가 하나만 보이고, X를 누르면 "내 장소" 시트가 자연스럽게 다시 올라옴.
- **배운 점**: 같은 화면에 새 오버레이를 추가할 때는 기존 오버레이의 `visible` 조건까지 같이 재검토해야 한다 — 각자 독립적으로 조건을 판단하면 "동시에 둘 다 true"인 상태가 생긴다.

### 3-2. Git 머지/체리픽 충돌 반복 발생 (4차례)
- **문제**: 세션 도중 여러 차례 `git merge`/`cherry-pick` 충돌이 발생(`MapPickerScreen.tsx`, `MapScreen.tsx` 2회, `ListScreen.tsx`).
- **원인**: 같은 기능(검색 패널 키보드 대응, 헤더 고정)을 이 세션과 다른 브랜치/커밋에서 **거의 동시에 독립적으로** 구현하면서, 서로 다른 브랜치 히스토리가 합쳐질 때마다 같은 위치가 충돌했다.
- **시도한 해결 방법**: 매번 충돌 양쪽 코드를 실제로 읽고 비교해서, 기능적으로 더 개선된 쪽(예: `keyboardHeight` 기반 위치가 `insets.bottom` 고정값보다 낫다, `handleCloseSearchResults`가 인라인 클로저보다 낫다)을 선택. 단순 변수명 충돌(`results` vs `places`)은 **충돌 이후의 코드가 참조하는 이름**을 기준으로 선택.
- **실패한 시도**: 없음 — 다만 첫 번째 충돌(`MapScreen.tsx`, 커밋 `c822fea` 체리픽)은 사용자가 `git add`를 인터럽트해 스테이징 전 단계에서 멈췄고, 이후 상황이 바뀌어(`git merge`로 전환) 같은 파일에 또 충돌이 났다.
- **최종 해결 방법**: 매 충돌마다 `grep`으로 마커 위치를 찾고, 충분한 컨텍스트를 읽은 뒤 `Edit`으로 마커를 제거하며 병합. 해결 후 `npx tsc --noEmit`으로 매번 컴파일 검증.
- **결과**: 4건 모두 해결, 매번 타입 에러 없이 통과 확인.
- **배운 점**: 머지 충돌 해결은 "우리 쪽/저쪽 중 하나를 고르는 기계적 작업"이 아니라, 각 코드가 **왜** 그렇게 짜였는지(주석·이후 코드의 의존성)를 읽고 판단해야 한다는 게 반복적으로 확인됐다.

### 3-3. EAS 클라우드 빌드 무료 플랜 월간 한도 소진
- **문제**: `eas build --platform android --profile preview` 실행이 `Error: build command failed.`로 실패.
- **원인**: 로그 확인 결과 `This account has used its Android builds from the Free plan this month` — 이 세션에서 지도 버그 수정을 확인하려고 반복적으로(6~7회) 클라우드 빌드를 돌리면서 월간 무료 빌드 수를 다 썼다.
- **시도한 해결 방법**: `eas build --local`(로컬 컴퓨트, 쿼터 무관) 시도.
- **실패한 시도**: `eas build --local`은 **Windows에서 Android 빌드가 지원되지 않음**(`Unsupported platform, macOS or Linux is required`)으로 즉시 실패.
- **최종 해결 방법**: EAS CLI를 거치지 않고 `npx expo prebuild --clean` + `cd android && ./gradlew assembleRelease`로 순수 Gradle 빌드를 직접 수행, 결과 APK를 프로젝트 밖 폴더로 복사.
- **결과**: 이후 모든 재빌드(코드 수정 반영, 브랜치 전환 반영 등)를 쿼터와 무관하게 로컬에서 반복 수행.
- **배운 점**: `eas build --local`은 이름 그대로 "로컬 컴퓨트"이지만 플랫폼 제약(Windows에서 Android 로컬 빌드 불가)이 있다는 것, 그리고 EAS를 거치지 않아도 순수 Gradle 명령으로 동일한 산출물을 얻을 수 있다는 것 — 다만 그 경우 EAS의 QR 배포 페이지는 별도로 만들 수 없어(빌드 산출물을 EAS 서버에 등록하는 과정이 없으므로) 공유 방법을 따로 마련해야 한다는 트레이드오프도 함께 확인.

### 3-4. `google-services.json`이 gitignore돼 있어 EAS 클라우드 빌드에서 인식 안 됨
- **문제**: `app.json`에 `googleServicesFile` 경로를 추가했는데, 클라우드 빌드 로그에 `File specified via "android.googleServicesFile" field in your app.json is not checked in to your repository and won't be uploaded to the builder.` 경고.
- **원인**: 이 프로젝트의 `.jks`/`*.key` 등 인증서류 파일을 전부 gitignore하는 컨벤션에 맞춰 `google-services.json`도 gitignore했는데, EAS 클라우드 빌드는 업로드 대상에서 gitignore된 파일을 제외한다(이전 세션에서 `.env.local`로 이미 겪은 것과 동일한 종류의 문제).
- **시도한 해결 방법**: 처음엔 "그냥 커밋하자"(가장 단순, 이 파일의 값은 진짜 시크릿이 아니라 Firebase 클라이언트 식별자에 가깝다는 논리로)를 제안.
- **실패한 시도**: 사용자가 다시 "EAS 클라우드 유지" 쪽으로 결정을 바꾸면서, 커밋 없이 가려면 `app.json`(정적 JSON, `process.env` 참조 불가)으로는 구조적으로 불가능하다는 것이 드러났다 — 정적 JSON에 발이 묶인 상태에서는 이 문제를 풀 수 없었다.
- **최종 해결 방법**: `app.json` → `app.config.js`(동적 JS) 전환 + `eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json`(레거시 API지만 정상 동작 확인) + `googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'` 분기.
- **결과**: 로컬은 파일을 그대로, 클라우드는 시크릿에서 내려받은 경로를 쓰도록 분기 완료. (다만 이후 EAS 클라우드 빌드 자체가 쿼터 소진으로 막혀, 이 경로가 실제 클라우드에서 끝까지 동작하는지는 **이 세션 내에서 최종 확인은 못함** — 9번 TODO 참고.)
- **배운 점**: "이 파일을 gitignore할 것인가"라는 결정은 로컬 개발 편의만이 아니라, 그 파일을 참조하는 설정(app.json/app.config.js)이 **동적 값을 지원하는 형식인지**까지 함께 고려해야 한다.

### 3-5. 백엔드 IDE에서 QueryDSL import 빨간 줄
- **문제**: `QCategory`, `QTransactionHistory` 등 QueryDSL이 자동 생성하는 클래스의 import가 IDE(처음 IntelliJ 가정 → 실제로는 VS Code)에서 전부 빨간 줄로 표시됨. 사용자는 "내가 백엔드를 건든 적도 없는데 왜 이러지, pull하면서 깨진 건가"로 원인을 몰랐음.
- **원인**: `build/generated/sources/annotationProcessor/java/main` 디렉터리가 **비어 있었음** — 즉 QueryDSL 어노테이션 프로세서가 아직 한 번도 제대로 돌지 않아 해당 클래스들이 실제로 디스크에 존재하지 않는 상태였다. 코드가 깨진 것도, 사용자가 손댄 것도 아니었다.
- **시도한 해결 방법**: `git log`/`git status`로 백엔드에 로컬 수정이 없음을 먼저 확인(사용자 책임이 아님을 배제), `./gradlew compileJava` 직접 실행.
- **실패한 시도**: 없음.
- **최종 해결 방법**: `compileJava` 성공 후 `build/generated/sources/.../QCategory.java` 등 9개 Q클래스가 실제로 생성된 것을 확인. IDE가 VS Code라는 게 뒤늦게 확인되어, IntelliJ용 안내("Gradle Reload") 대신 **"Java: Clean Java Language Server Workspace"** 명령으로 안내를 정정.
- **결과**: 빌드는 성공, VS Code 캐시 갱신 안내까지 전달 — 실제로 빨간 줄이 없어졌는지는 사용자 쪽 확인 필요(문서 작성 시점까지 재확인 요청 없음).
- **배운 점**: "무엇을 건드렸길래 깨졌나"라는 질문에 곧바로 원인 찾기에 들어가기 전에, 먼저 **정말 깨진 것인지, 원래 안 만들어져 있던 것뿐인지**를 구분해야 한다 — `git log`/`git status`로 "내 책임이 아님"을 빠르게 배제한 뒤 실제 원인(빌드 산출물 부재)으로 좁혀간 것이 효율적이었다.

### 3-6. 앱 아이콘이 기본 로고로 보임 (재빌드 후)
- **문제**: 새로 빌드한 APK를 설치했더니 아낄지도 로고가 아니라 Expo 기본 로고가 보였다는 보고.
- **원인 조사**: `assets/images/icon.png`를 직접 열어 확인한 결과 **소스 파일 자체는 정상**(진짜 로고, 기본 아이콘 아님)이었다. `app.config.js`/`app.json`의 `name` 필드도 `"아낄지도"`로 정상.
- **결론**: 소스·설정 모두 정상이라는 것을 근거로, 실제 원인은 **런처 아이콘 캐시**(같은 패키지명에 예전 기본-로고 버전을 덮어 설치했을 때 삼성 런처가 아이콘을 안 갱신하는 흔한 현상)로 추정. `adb uninstall` 후 재설치를 안내.
- **결과**: 이 세션 안에서 사용자가 실제로 재설치해 해결됐는지까지는 확인되지 않음(TODO).
- **배운 점**: "소스가 잘못됐다"고 단정하기 전에 실제 파일을 열어 확인하는 절차(추측 대신 검증)가 잘못된 방향으로 시간을 쓰는 것을 막았다.

---

## 4. 설계 의사결정

### 4-1. `KakaoMap`에 반경/색상을 prop으로 노출할지, 시연 페이지에서만 별도 처리할지
- **선택**: `myPlaceCircleRadius`/`myPlaceCircleColor`를 `KakaoMap`/`kakaoMapHtml.ts`의 정식 prop으로 추가(기본값은 기존 서비스 값 유지).
- **고려했던 대안**: 시연 페이지만을 위한 별도 WebView HTML/함수를 만드는 방법도 가능했지만, 기존 `setMyPlaceCircle` 함수와 로직이 거의 동일해 중복이 컸다.
- **최종 선택 이유**: prop 기본값을 "생략 시 기존 동작"으로 설계하면 실서비스 화면(MapScreen, MyPlacesScreen)에 영향이 전혀 없으면서도 재사용 가능한 확장이 되기 때문. 이후 유사한 시연/테스트 요구가 또 생겨도 같은 방식으로 대응 가능.

### 4-2. 리포트 화면 추천 UI: 새로 만들 것인가, 기존 걸 재사용할 것인가
- **선택**: `RecommendModal.tsx`에서 `RecommendationRow` 컴포넌트를 추출해 양쪽에서 재사용.
- **고려했던 대안**: 리포트 화면에 있던 기존 커스텀 렌더링(번호+장소+이유+시간, 원 없음, `+`아이콘 없음)을 그대로 두고 스타일만 흉내 내는 방법도 가능했다.
- **최종 선택 이유**: 사용자가 명시적으로 "가능하면 방앗간 알림 추천 모달에서 사용하는 컴포넌트와 로직을 재사용해 두 화면의 동작과 디자인이 달라지지 않도록 한다"고 요구했고, 실제로 두 화면이 이미 한 차례 디자인이 갈려 있던 상태였다(모달은 `+`아이콘 있음/원 없음, 리포트는 원 있음/`+`아이콘 없음) — 컴포넌트를 하나로 합치는 것이 향후 재발을 구조적으로 막는 방법이었다.

### 4-3. 알림 저장 로직: 화면마다 구현할 것인가, 훅으로 공유할 것인가
- **선택**: `useSaveRecommendedAlarm` 훅으로 추출, 홈 화면도 이 훅을 쓰도록 교체.
- **고려했던 대안**: 리포트 화면에 홈 화면과 별개로 저장 함수를 새로 작성(빠르지만 중복).
- **최종 선택 이유**: 저장 로직(API 호출 + 로컬 알림 장소 목록 동기화 + 에러 얼럿)이 이미 30줄 넘는 실동작 코드였고, 두 화면이 다른 저장 동작을 가지면 한쪽만 버그가 나거나 한쪽만 고쳐지는 위험이 있어 "동작이 갈리지 않게" 하는 것이 요구사항의 핵심이었다.

### 4-4. 머지 충돌 해결 시 판단 기준
- **선택**: 매 충돌마다 "이후 코드가 참조하는 이름/구조"와 "기능적으로 더 개선된 버전"을 기준으로 선택(기계적으로 HEAD/theirs 한쪽을 고정 선택하지 않음).
- **고려했던 대안**: 항상 HEAD(로컬)를 우선하거나 항상 incoming을 우선하는 단순 규칙.
- **최종 선택 이유**: 실제로 두 방향 다 "더 나은 쪽"이 될 수 있었다(예: `MapPickerScreen.tsx`에서는 로컬의 `keyboardHeight` 버전이 더 나았고, `ListScreen.tsx`에서는 incoming의 `keyboardShouldPersistTaps` 포함 버전이 더 나았다) — 규칙을 고정하면 한쪍에서는 반드시 개선 사항을 잃게 된다.

### 4-5. `google-services.json` 배포: 커밋 vs 시크릿+동적 설정
- **선택**: 최종적으로 `app.config.js` 전환 + EAS 파일 시크릿(사용자가 "EAS 클라우드 유지"를 재확인한 이후).
- **고려했던 대안**: 그냥 git에 커밋해서 정적 `app.json`을 그대로 쓰는 방법(가장 단순, 한 차례 실제로 추천했음).
- **최종 선택 이유**: 이 프로젝트의 기존 컨벤션(인증서류 파일 전부 gitignore)과 사용자의 최종 의사(클라우드 빌드 계속 사용)를 함께 만족시키려면 정적 설정으로는 불가능했고, 동적 설정 전환이 유일한 경로였다. (반대로 "그냥 커밋"이 더 간단했다는 점도 사용자에게 명시적으로 알리고 선택은 사용자가 하게 함.)

---

## 5. 수정한 파일

| 파일 | 수정 목적 | 핵심 변경 |
|---|---|---|
| `components/map/KakaoMap.tsx` | 반경/색상 커스터마이징 지원 | `myPlaceCircleRadius`, `myPlaceCircleColor` prop 추가, `injectJavaScript` 인자 확장 |
| `components/map/kakaoMapHtml.ts` | 위와 동일 | `setMyPlaceCircle(place, radius, color)`로 파라미터화, dot에 인라인 style 적용 |
| `src/screens/MapScreen.tsx` | 검색 결과 목록/시트 통합, 시간 표시용 데이터 흐름 | `hasSearchResults` 기반 시트 상호배타 처리, `handleCloseSearchResults`, `userMovedMapRef` 적용, 검색 패널 `keyboardHeight` 기반 위치 |
| `src/api/transactionMapApi.ts` | 아코디언 상세에 시간 표시 근거 데이터 제공 | `GroupedMapTransactionDate`에 `datetime` 필드 추가 |
| `src/screens/ReportScreen.tsx` | 방앗간 추천 클릭 시 저장 모달 연결 | `RecommendationRow`/`toReportRecommendations`/`SaveAlarmModal`/`useSaveRecommendedAlarm` 도입, 커스텀 렌더링·미사용 스타일 제거 |
| `src/screens/HomeScreen.tsx` | 저장 로직 공유화 | 인라인 저장 함수 제거 → `useSaveRecommendedAlarm` 훅 사용으로 교체 |
| `components/report/RecommendModal.tsx` | 추천 UI 재사용 가능하게 분리 | `RecommendationRow` export, 번호를 초록 원 스타일로 변경 |
| `hooks/useSaveRecommendedAlarm.ts` (신규) | 저장 로직 공유 | 홈 화면 로직을 그대로 이전 |
| `src/screens/ListScreen.tsx` | 헤더 고정 | `AppScreen scrollable` 제거, 헤더를 스크롤 밖으로 이동 |
| `src/screens/TransactionEditScreen.tsx` | 키보드 대응 | `AppScreen`에 `scrollable` 추가 |
| `src/screens/NotificationScreen.tsx` | 용어 통일 | `'위치 알림'` → `'방앗간 알림'` |
| `app/test.tsx` (신규, gitignore 대상) | 500m 반경 시연 | `KakaoMap`에 데모 좌표/반경/색 전달 |
| `app.json` → `app.config.js` | 동적 설정 전환 | `googleServicesFile` 환경변수 분기 |
| `.gitignore` | 인증서류 파일 보호 | `google-services.json` 추가 |

---

## 6. 중요한 코드 변경

- **`GroupedMapTransactionDate`에 `datetime` 추가** — 날짜별로 여러 거래를 합산하는 기존 그룹핑 로직은 그대로 두고, "그 그룹의 첫 거래의 실제 시각"만 추가로 흘려보내는 최소 변경으로 시간 표시 요구를 만족시켰다(그룹핑 자체의 의미를 바꾸지 않음).
- **`setMyPlaceCircle(place, radius, color)` 파라미터화** — 기존 호출부(MapScreen, MyPlacesScreen)는 세 번째·네 번째 인자를 안 넘기므로 `radius || 2000`, `color || PIN_COLOR` fallback으로 기존 동작을 100% 보존하면서 신규 요구(500m, 빨간색)를 만족.
- **`useSaveRecommendedAlarm`** — 부작용(API 호출, 로컬 스토리지 동기화, 에러 얼럿)을 훅 내부로 캡슐화하고 `onSaved` 콜백만 바깥에서 주입받게 해, 호출부(홈/리포트)는 "저장 성공 시 모달을 닫는다"는 화면별 UI 결정만 갖게 됨.

---

## 7. 기술적으로 의미 있는 구현

### 직접 구현한 부분
- 지도 검색 패널과 "내 장소" 시트의 상호 배타적 `visible` 상태 설계.
- `KakaoMap`의 재사용 가능한 반경/색상 API(기존 동작 보존 원칙의 fallback 설계).
- 머지 충돌을 코드 의미 분석 기반으로 해결(각 충돌마다 실제 diff를 읽고 판단, 기계적 선택 지양).

### 라이브러리를 활용한 부분
- `expo-router`의 파일 기반 라우팅으로 별도 링크 없는 스크래치 화면(`app/test.tsx`)을 딥링크(`frontend://test`)로 접근.
- Gradle Wrapper(`./gradlew assembleRelease`)를 EAS 없이 직접 호출해 동일한 릴리즈 산출물 확보.
- QueryDSL 어노테이션 프로세서의 산출물 경로(`build/generated/sources/annotationProcessor`)를 정확히 이해하고 진단.

### 기술적으로 어필할 수 있는 부분
- **빌드 파이프라인 장애 대응력**: EAS 클라우드 쿼터 소진이라는 예상 밖의 장애를 만났을 때, "결제해야 하나"로 끝내지 않고 로컬 Gradle 빌드라는 대체 경로를 즉시 확보해 작업을 이어갔다.
- **정적 설정의 구조적 한계 인식**: `app.json`(정적 JSON)으로는 환경변수 분기가 원천적으로 불가능하다는 것을 인지하고, `app.config.js`(동적 JS) 전환이라는 근본적 해결책을 제시했다 — 우회책이 아니라 구조 변경으로 문제를 없앤 사례.
- **반복되는 머지 충돌에서의 일관된 판단 기준 수립**: 4차례의 충돌을 모두 "더 개선된 버전 선택"이라는 같은 원칙으로 풀어, 매번 임의로 판단하지 않고 일관성을 유지했다.

---

## 8. 개발 과정에서 변경된 요구사항

| 항목 | 처음 요구사항 | 변경된 요구사항 | 변경 이유 | 최종 구현 |
|---|---|---|---|---|
| Map Picker 충돌 | "map picker screen에 충돌나는 거 수정" (코드 버그로 추정) | 실제로는 git merge/cherry-pick 충돌 | 확인해보니 코드 로직 문제가 아니라 저장소 상태(진행 중인 cherry-pick) 문제였음 | 충돌 마커 해결 + 해결 방식 설명 |
| APK 생성 방식 | EAS 클라우드 빌드로 QR 생성 | 로컬 Gradle 빌드 + 수동 폴더 복사 | EAS 무료 쿼터 소진, 사용자가 결제 대신 로컬 빌드 선택 | `AkkilMapAPK` 폴더에 반복 복사 |
| `google-services.json` 배포 방식 | (사용자 제시) 시크릿 등록 + `app.config.js` 전환 | → "그냥 하던 대로 빌드만" 요청 → 커밋 방식 제안 → 다시 "EAS 클라우드로" 원복 | 사용자가 원하는 배포 방식(클라우드 유지)이 중간에 재확인되며 최종 결정이 원래 계획으로 회귀 | `app.config.js` + EAS 파일 시크릿 |
| 지도 반경 시연 | "500m 버전 하나 만들어서 보고 싶다" | "파란색 말고 빨간색으로, 내 위치 원도 500m 원도" | 시각적으로 구분되게 보고 싶다는 요구가 추가됨 | `myPlaceCircleColor` prop까지 추가 확장 |
| 브랜치 작업 | (특정 브랜치 암묵 가정) | "이 브랜치 걸로 다시 해줘" | 사용자가 중간에 다른 브랜치(`frontend/main`)로 전환 | 현재 체크아웃된 브랜치 기준으로 재빌드 |

---

## 9. 남아 있는 TODO

- **HomeScreen 하드코딩 닉네임("Dust") 및 리포트 팝업 목업 문제** — 전체 점검에서 발견했고, 이후 다른 브랜치의 머지로 관련 파일(`HomeScreen.tsx`, `reportAdapters.ts`, `useReportPushHandler.ts` 등)이 대거 갈아치워졌다. **이 세션에서 직접 재확인은 안 했으므로**, 실제로 해결됐는지 별도 확인 필요.
- **`app.json`과 `app.config.js` 동시 존재** — `app.config.js` 전환 후 `app.json`을 지우지 않아 저장소에 둘 다 남아있다(현재는 `app.config.js`가 우선하므로 동작엔 문제없으나 혼란 소지 있음). 정리 대상.
- **`app.apk`(109MB) git 히스토리 잔존** — 작업 트리/최신 커밋에서는 삭제했지만, 과거 커밋 히스토리에는 여전히 남아있어 저장소 용량에 계속 영향. `git filter-repo`/BFG + force-push가 필요한 별도의 큰 작업으로, 이번 세션에서는 착수하지 않음.
- **EAS 무료 빌드 쿼터** — 9월 1일 리셋 전까지는 계속 로컬 빌드로 우회해야 함. 클라우드 QR 배포가 다시 필요해지면 유료 플랜 업그레이드 여부를 사용자가 결정해야 함.
- **QR 공유용 다운로드 링크** — 로컬로 빌드한 APK를 구글 드라이브/GitLab 등에 실제로 업로드하는 작업은 사용자가 직접 해야 함(이 세션에서는 파일 준비까지만 완료).
- **앱 아이콘이 기본 로고로 보였던 문제** — 소스는 정상 확인했고 원인을 런처 캐시로 추정했지만, 실제로 완전 삭제 후 재설치해서 해결됐는지는 확인되지 않음.
- **백엔드 QueryDSL IDE 빨간 줄** — 빌드는 성공시켰고 VS Code 캐시 정리 명령까지 안내했지만, 실제로 IDE에서 빨간 줄이 사라졌는지 재확인 요청은 없었음.

---

## 10. 최종 요약

### 이번 대화에서 가장 중요한 구현 Top 10
1. 지도 화면 검색 결과 Bottom Sheet ↔ "내 장소" Bottom Sheet 상호 배타 처리
2. 리포트 화면 방앗간 추천 → `SaveAlarmModal` 연결 (기능 자체가 없던 것을 신규 구현)
3. `RecommendationRow` 컴포넌트 추출로 홈/리포트 화면 추천 UI 통합
4. `useSaveRecommendedAlarm` 훅 추출로 저장 로직 공유
5. 지도 아코디언 상세 내역 시간 표시 추가
6. `KakaoMap` 반경/색상 커스터마이징 API 추가 + 500m 시연 페이지
7. `내역`/`리스트·캘린더·분석` 헤더 고정 패턴 통일
8. `app.json` → `app.config.js` 전환 (동적 설정 체계로 이행)
9. EAS 클라우드 빌드 실패 시 로컬 Gradle 빌드로의 파이프라인 전환
10. `.gitignore`/저장소 위생 정리(109MB 바이너리, 오타 브랜치 삭제)

### 가장 중요한 트러블슈팅 Top 5
1. EAS 클라우드 빌드 무료 쿼터 소진 → 로컬 빌드 전환
2. `google-services.json` gitignore로 인한 클라우드 빌드 미인식 → `app.config.js` 전환
3. Git 머지/체리픽 충돌 4차례 반복 해결
4. 지도 화면 Bottom Sheet 중첩 표시 문제
5. 백엔드 QueryDSL Q클래스 미생성으로 인한 IDE 오류

### 가장 중요한 설계 결정 Top 5
1. 알림 저장 로직을 화면별 구현 대신 훅으로 공유 (`useSaveRecommendedAlarm`)
2. 추천 UI를 중복 구현 대신 컴포넌트 추출로 통합 (`RecommendationRow`)
3. 머지 충돌 해결 기준을 "더 개선된 버전"으로 일관되게 적용(고정 규칙 대신 판단)
4. `KakaoMap` prop 확장 시 "기존 기본값 보존"을 최우선 원칙으로 설계
5. `google-services.json` 배포를 정적 설정의 구조적 한계로 진단하고 동적 설정으로 전환

### 가장 많이 수정한 영역
**`src/screens/MapScreen.tsx`** — 검색 결과 UI 추가, 시간 표시 관련 데이터 흐름, 두 차례의 머지 충돌 해결까지 이 세션에서 가장 많은 편집이 집중된 파일. 그 다음은 리포트/추천 관련 3파일(`ReportScreen.tsx`, `RecommendModal.tsx`, `HomeScreen.tsx`)과 앱 설정 파일(`app.json`/`app.config.js`/`.gitignore`).

### 이번 대화에서 가장 큰 기술적 성과
**EAS 클라우드 빌드가 막힌 상황에서 로컬 Gradle 빌드로 파이프라인을 즉시 대체하고, 동시에 `google-services.json`이라는 정적 설정의 구조적 한계를 `app.config.js` 전환으로 근본 해결한 것.** 두 문제 모두 "코드 버그"가 아니라 "빌드/배포 인프라" 레이어의 문제였고, 둘 다 임시方편이 아니라 구조를 바꿔서 해결했다는 점에서 이 세션의 가장 실무적인 성과로 볼 수 있다.

---

*이 문서는 이 Claude Code 대화 내용만을 근거로 작성했으며, 추측이 필요한 부분(예: HomeScreen 목업 문제의 최종 해결 여부, 아이콘 캐시 문제의 실제 해결 확인)은 9번 TODO에 명시적으로 남겨두었다.*
