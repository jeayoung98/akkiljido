# 카카오맵 APK 표시 문제 — 트러블슈팅 기록

작성 시점 기준(2026-08-07), `frontend/apk` 브랜치와 `frontend/main`의 git diff, 현재 `eas.json`/`app.json`/`AndroidManifest.xml`/지도 관련 코드를 직접 확인해서 작성함. 확인 안 된 부분은 "확인 안 됨"으로 명시.

## 증상

Expo 개발 환경에서는 카카오맵이 정상 표시되지만, EAS로 빌드한 standalone APK(preview 프로필)에서는 지도 영역이 흰 화면으로 남는 문제. WebView(`RNCWebView`)는 정상 생성/렌더링되고 있었고(logcat상 nonzero 크기 확인), 크래시도 없었음 — 즉 "터졌는데 안 보이는" 게 아니라 "조용히 실패해서 안 보이는" 상황이었음.

---

## 1. 반드시 필요했던 변경

### 1-1. WebView `baseUrl`을 `https://localhost`로 설정

- **파일**: [KakaoMap.tsx](../components/map/KakaoMap.tsx)
- **무엇**: `<WebView source={{ html }} />` → `<WebView source={{ html, baseUrl: 'https://localhost' }} />`
- **왜**:
  - `baseUrl` 없이 raw HTML을 WebView에 올리면 origin이 `about:blank`가 되어, Kakao Maps JS SDK가 하는 도메인 검증을 통과하지 못한다.
  - Kakao SDK는 지도 모듈(`kakao.js`)이나 타일 이미지 같은 하위 리소스를 요청할 때 `location.protocol`과 같은 스킴을 그대로 쓴다. `baseUrl`이 `http://localhost`면 이 요청들도 `http://`로 나가고, Android는 기본적으로 평문(HTTP) 요청을 차단(`net::ERR_CLEARTEXT_NOT_PERMITTED`)한다.
- **해결된 문제**: 흰 화면(지도 자체가 전혀 안 뜨는 문제). `chrome://inspect`로 직접 확인한 콘솔 로그에 `kakao.js:1 Failed to load resource: net::ERR_CLEARTEXT_NOT_PERMITTED`가 찍혀 있었음 — 지도 모듈 자체가 네트워크 단계에서 차단당하고 있었다는 직접 증거.
- **검증**: 이 수정을 적용한 빌드를 설치한 뒤 사용자가 지도가 정상적으로 뜨는 것을 직접 확인함.
- **유지 여부**: 유지 (현재 코드에 반영됨).

### 1-2. Kakao Developers 콘솔에 `https://localhost`를 JavaScript SDK 도메인으로 등록

- **위치**: Kakao Developers 콘솔 (저장소 밖의 외부 설정, 코드에는 흔적 없음)
- **무엇**: [내 애플리케이션] > [앱 설정] > [플랫폼 키] > JavaScript SDK 도메인 목록에 `https://localhost` 추가. (`http://localhost`, `http://127.0.0.1:5500` 등 기존 항목은 그대로 유지됨 — 스크린샷으로 확인)
- **왜**: `baseUrl`을 `https://localhost`로 바꾸면 WebView 페이지의 origin도 `https://localhost`가 되므로, SDK가 도메인 검증을 통과하려면 이 정확한 origin이 콘솔에 등록돼 있어야 한다.
- **확인 상태**: 사용자가 콘솔 화면 스크린샷으로 `https://localhost` 등록을 직접 확인함(이미 등록되어 있었음).
- **유지 여부**: 유지. (외부 콘솔 설정이므로 저장소에서 관리되지 않음 — 다른 환경으로 마이그레이션 시 다시 등록해야 함을 기억해둘 것.)

### 1-3. SDK를 `autoload=false`로 불러오고 `kakao.maps.load(callback)`으로 초기화 지연

- **파일**: [kakaoMapHtml.ts](../components/map/kakaoMapHtml.ts)
- **무엇**:
  - 스크립트 URL: `sdk.js?appkey=...` → `sdk.js?appkey=...&autoload=false`
  - 지도 생성 코드(`new kakao.maps.Map(...)` 등) 전체를 `kakao.maps.load(function () { ... })` 콜백 안으로 이동
- **왜**: Kakao Maps SDK는 `<script src="...sdk.js">` 태그가 실행된 시점에도 `kakao.maps.Map`/`LatLng` 같은 실제 지도 기능이 아직 만들어져 있지 않다. SDK 내부적으로 실제 모듈(`t1.daumcdn.net/mapjsapi/js/main/4.5.26/kakao.js`)을 비동기로 추가 로드하는 구조라서, 이 로드가 끝나기 전에 `new kakao.maps.LatLng(...)`를 호출하면 에러가 난다.
- **해결된 문제**: logcat에서 직접 확인한 에러 —
  ```
  TypeError: kakao.maps.LatLng is not a constructor
      at http://localhost/:62:15
  ```
  이 수정 적용 후 이후 빌드의 재현 로그에서 이 에러는 더 이상 관측되지 않음.
- **유지 여부**: 유지.

### 1-4. 진단용 에러 계측 추가 (`window.onerror`, `<script onerror>`, try/catch → `postMessage`, `webviewDebuggingEnabled`)

- **파일**: [kakaoMapHtml.ts](../components/map/kakaoMapHtml.ts), [KakaoMap.tsx](../components/map/KakaoMap.tsx)
- **무엇**:
  - HTML 안에 `window.onerror` 핸들러 추가 → 잡힌 에러를 `postMessage({type:'error', message})`로 RN에 전달
  - Kakao SDK `<script>` 태그에 `onerror` 속성 추가(스크립트 자체 로드 실패 감지)
  - 지도 초기화 코드를 try/catch로 감싸서 에러 메시지를 postMessage
  - `KakaoMap.tsx`의 `WebView`에 `onError`/`onHttpError` 핸들러, `webviewDebuggingEnabled` prop 추가 (release/preview 빌드는 기본적으로 `chrome://inspect` 디버깅이 꺼져 있는데, 이 prop으로 강제로 켬)
- **왜**: 원래 코드는 지도가 안 뜨는 상황에서 RN·logcat 어디에도 원인이 남지 않는 구조였음(성공 신호만 있고 실패 신호가 없었음).
- **해결된 문제**: 이 계측 자체가 문제를 "고친" 건 아니지만, 1-3(`LatLng is not a constructor`)과 1-1(`ERR_CLEARTEXT_NOT_PERMITTED`)의 실제 원인을 찾아낸 도구였음. 계측이 없었다면 두 원인 모두 발견할 수 없었음.
- **유지 여부**: 유지 권장. 다만 `webviewDebuggingEnabled`를 프로덕션에서도 계속 켜둘지는 별도 판단 필요(현재는 켜진 상태로 유지 중).

---

## 2. 문제 해결에 효과가 없었던 시도

### 2-1. `baseUrl: 'http://localhost'` (최초 시도, https 이전)

- **파일**: [KakaoMap.tsx](../components/map/KakaoMap.tsx) — 이번 트러블슈팅 시작 시점에 이미 적용되어 있던 상태
- **시도한 이유**: origin을 `about:blank`가 아닌 고정 도메인으로 만들어서, Kakao 콘솔에 등록된 도메인(`http://localhost`)과 일치시키려는 목적.
- **효과가 없었던 이유**: 도메인 등록 문제는 해결됐지만(그 origin 자체는 등록돼 있었음), Kakao SDK가 하위 리소스를 `location.protocol`과 같은 스킴(`http`)으로 요청하게 만들어서 Android의 cleartext 차단 정책에 새로 걸리게 됨. 즉 한 문제를 해결하려다 다른 문제를 만든 상태였음.
- **최종 처리**: `https://localhost`로 대체(제거).

---

## 3. 다른 목적에는 필요했지만 지도 표시 문제와 직접 관련 없는 변경

### 3-1. `app.json`의 `android.permissions` (위치 권한 5개)

- **파일**: [app.json](../app.json)
- **무엇**: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` 추가
- **왜**: 위치 기반 알림(백그라운드 위치 추적) 기능에 필요.
- **지도 문제와의 관계**: 무관. 지도는 좌표를 props로 받아 그리는 구조라 위치 권한 없이도 렌더링됨.
- **유지 여부**: 유지 (다른 기능에 필요).

### 3-2. EAS 환경변수 등록 (`eas env:set`)

- **위치**: EAS 클라우드 설정 (저장소에는 값이 없고, `eas env:list`로만 확인 가능)
- **무엇**: `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_KAKAO_JS_KEY`, `EXPO_PUBLIC_KAKAO_REST_KEY`를 `preview` 환경에 등록.
- **왜**: `.env.local`은 `.gitignore`(`.env*.local`)에 걸려 있어서 EAS 클라우드 빌드에 자동으로 전달되지 않음. 별도로 등록하지 않으면 APK에서 이 값들이 전부 `undefined`가 됨.
- **지도 문제와의 관계**: 이번 트러블슈팅 중 직접 대조 확인함 — EAS에 등록된 `EXPO_PUBLIC_KAKAO_JS_KEY` 값이 로컬 `.env.local`과 완전히 동일(32자, 접두/접미 일치). 즉 **키 값 자체는 지도가 안 뜬 원인이 아니었음**. 다만 이 등록이 안 되어 있었다면 APK 자체가 정상 동작할 수 없었으므로, 넓게 보면 "APK가 쓸모 있으려면" 필요한 선행 조건.
- **유지 여부**: 유지.

### 3-3. Google Sign-In용 SHA-1 인증서 지문 등록 (Firebase/GCP 콘솔)

- **위치**: Firebase/GCP 콘솔 (저장소 밖의 외부 설정)
- **배경**: 이전 세션에서 Google Sign-In `DEVELOPER_ERROR`를 진단한 결과, 로컬 debug keystore의 SHA-1과 EAS 관리형 keystore(빌드 로그 기준 `Build Credentials FL8BjfMHHl`, default)의 SHA-1이 서로 다르다는 것이 원인으로 지목됨.
- **필요했던 조치**: 두 SHA-1을 모두 Firebase/GCP 콘솔에 등록해야 한다는 결론.
- **확인 상태**: **확인 안 됨** — 이번 세션에서는 카카오맵 문제만 다뤘고, 실제로 콘솔에 등록이 완료됐는지 재확인하지 않았음. 완료됐다고 단정할 수 없음.
- **지도 문제와의 관계**: 무관. 이 세션 내내 지도 관련 재현/테스트가 계속 가능했다는 것 자체가, SHA-1 등록 여부와 APK 실행/지도 렌더링이 서로 독립적이라는 증거.
- **유지 여부**: (등록되어 있다면) 유지. 등록 여부 재확인 필요 — Google 로그인 기능을 쓸 때만 영향받음.

### 3-4. `eas.json` 빌드 프로필

- **파일**: [eas.json](../eas.json)
- **무엇**: `development`/`preview`/`production` 빌드 프로필 정의 (buildType 오버라이드 없음, 기본값 사용)
- **왜**: EAS 클라우드 빌드를 돌리기 위한 필수 설정 파일.
- **지도 문제와의 관계**: 무관 (빌드 자체를 가능하게 하는 설정이지, 지도 렌더링 로직과는 별개).
- **유지 여부**: 유지.

---

## 4. 최종적으로 유지해야 하는 설정

| 항목 | 위치 | 상태 |
|---|---|---|
| `baseUrl: 'https://localhost'` | `KakaoMap.tsx` | 코드에 반영됨 |
| `autoload=false` + `kakao.maps.load(callback)` | `kakaoMapHtml.ts` | 코드에 반영됨 |
| `window.onerror`/`<script onerror>`/try-catch 에러 계측 | `kakaoMapHtml.ts` | 코드에 반영됨 |
| `onError`/`onHttpError`/`webviewDebuggingEnabled` | `KakaoMap.tsx` | 코드에 반영됨 |
| `https://localhost` — JS SDK 도메인 등록 | Kakao Developers 콘솔 | 등록 확인됨(스크린샷) |
| 위치 권한 5개 | `app.json` | 코드에 반영됨 |
| `EXPO_PUBLIC_*` 4개 환경변수 | EAS `preview` 환경 | 등록 확인됨(빌드 로그로 검증) |
| SHA-1 (debug + EAS keystore) | Firebase/GCP 콘솔 | **재확인 필요**(이번 세션에서 미확인) |

**제거된 것**: `frontend/app.apk` (109MB 바이너리, 실수로 커밋되어 있었음 — 작업 트리/최신 커밋에서 삭제함. 단, 이전 커밋 히스토리에는 여전히 남아있어 저장소 용량에는 영향이 계속됨. 완전히 없애려면 `git filter-repo`/BFG + force-push가 필요하며 이는 원격 히스토리를 재작성하는 별도의 큰 작업임).

---

## 요약

- **APK 빌드에 필수**: EAS 환경변수 등록(`eas env:set`), `eas.json` 빌드 프로필. (Google 로그인 기능을 쓴다면 SHA-1 등록도 필요하지만 이건 APK 빌드/실행 자체와는 무관하고 로그인 기능에만 영향)
- **지도 표시에 필수**: WebView `baseUrl`을 `https://` 스킴의 고정 도메인으로 설정 + 그 도메인을 Kakao 콘솔 JS SDK 도메인에 등록 + SDK를 `autoload=false`로 불러와 `kakao.maps.load(callback)` 안에서만 지도 API 호출
- **효과 없었던 시도**: `baseUrl`을 `http://localhost`로만 설정 — 도메인 등록 문제는 해결하지만 Android cleartext 차단 문제를 새로 유발함
- **최종 유지 설정**: 위 "4. 최종적으로 유지해야 하는 설정" 표 전체
- **다시 같은 작업을 할 경우 필요한 최소 작업**:
  1. WebView `source`에 `baseUrl: 'https://<고정 도메인>'` 지정 (반드시 `https`)
  2. 그 도메인을 Kakao Developers 콘솔의 JavaScript SDK 도메인 목록에 등록
  3. SDK 스크립트 URL에 `&autoload=false` 추가
  4. 지도 생성/초기화 코드를 `kakao.maps.load(function() { ... })` 콜백 안에 작성
  5. (선택이지만 강력 추천) `window.onerror` + WebView `onError`/`onHttpError`로 실패를 눈에 보이게 만들어두기 — 안 그러면 다음에 비슷한 문제가 또 생겨도 원인을 못 찾음
