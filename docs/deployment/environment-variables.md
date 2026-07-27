# 환경변수 관리 정책

이 문서는 백엔드, PostgreSQL/PostGIS, Redis가 사용하는 환경변수의 명세와 개발·운영 환경의 관리 기준을 정의한다. 실제 비밀번호, 토큰, API 키와 같은 Secret 값은 이 문서와 Git 저장소에 기록하지 않는다.

## 환경변수 명세

| 변수명 | 사용 대상 | 용도 | 로컬 값 | 운영 값 | 필수 여부 | Secret 여부 |
| --- | --- | --- | --- | --- | --- | --- |
| `SERVER_PORT` | Backend | Spring Boot HTTP 포트 | `8080` | 기본값 `8080` 또는 배포 환경 지정값 | 아니오 | 아니오 |
| `SPRING_PROFILES_ACTIVE` | Backend | 활성 Spring Profile | `local` | `prod` | 운영: 예 | 아니오 |
| `DB_HOST` | Backend | PostgreSQL 호스트 | `localhost` | Compose 서비스명 `postgres` | 운영: 예 | 아니오 |
| `DB_PORT` | Backend, PostgreSQL | PostgreSQL 포트 | `5432` | 컨테이너 내부 포트 `5432` | 아니오 | 아니오 |
| `DB_NAME` | Backend, PostgreSQL | 데이터베이스 이름 | `project` | 배포 환경 지정값 | 운영: 예 | 아니오 |
| `DB_USERNAME` | Backend, PostgreSQL | 데이터베이스 사용자 | `project` | 배포 환경 지정값 | 운영: 예 | 아니오 |
| `DB_PASSWORD` | Backend, PostgreSQL | 데이터베이스 인증 비밀번호 | 공유 기본값 없음 | Secret 관리 도구의 값 | 예 | 예 |
| `REDIS_HOST` | Backend | Redis 호스트 | `localhost` | Compose 서비스명 `redis` | 운영: 예 | 아니오 |
| `REDIS_PORT` | Backend, Redis | Redis 포트 | `6379` | 컨테이너 내부 포트 `6379` | 아니오 | 아니오 |

현재 코드와 설정에서 사용하는 운영 환경변수는 위 목록뿐이다. OAuth Client Secret, Token, API Key, Private Key는 아직 현재 백엔드 설정에서 사용하지 않으므로 명세에 추가하지 않는다.

## 파일 및 Secret 관리

- `.env.example`은 변수명과 안전한 개발 예시만 공유하는 Git 추적 파일이다.
- 개인 개발 값은 저장소 루트의 `.env.local`에 작성하며 Git에 커밋하지 않는다.
- `.env`, `.env.prod`, `.env.production`, `.env.*.local` 등 실제 값이 들어갈 수 있는 파일은 `.gitignore`의 `.env`와 `.env.*` 규칙으로 제외한다.
- `DB_PASSWORD`를 비롯한 실제 Secret은 코드, 문서, Docker 이미지, Notion에 기록하지 않는다.
- 운영 Runtime Secret은 EC2의 `/opt/akkiljido/.env.prod`에서만 관리하며 GitLab CI/CD Variable에 복제하지 않는다.
- Secret이 Git 이력에 포함된 경우 파일 삭제만으로 해결하지 않고 해당 Credential을 폐기·재발급한 뒤 이력 정리 필요성을 별도로 검토한다.

## 개발 환경

1. `.env.example`을 `.env.local`로 복사한다.
2. `DB_PASSWORD`에 팀에서 정한 개인 로컬 개발 값을 입력한다.
3. Spring Boot를 IDE에서 직접 실행할 때는 `.env.local`의 변수를 실행 구성에 등록한다. Spring Boot가 `.env.local`을 자동으로 읽지는 않는다.
4. 환경변수를 생략하면 `application.yml`의 기본 Profile인 `local`이 활성화된다. `application-local.yml`은 호스트에서 실행하는 PostgreSQL과 Redis를 위해 `localhost` 기본값을 사용한다.

`DB_PASSWORD`에는 코드 기본값이 없다. 로컬 실행에서도 반드시 외부 환경변수로 제공한다.

## 운영 환경

- `SPRING_PROFILES_ACTIVE=prod`를 명시한다.
- `application-prod.yml`은 DB 호스트, DB 이름, DB 사용자, DB 비밀번호, Redis 호스트를 외부 환경변수로 요구하며 Secret 기본값을 제공하지 않는다.
- Docker 네트워크 내부에서는 컨테이너 IP나 `localhost` 대신 Compose 서비스명인 `postgres`, `redis`를 사용한다.
- `DB_PORT=5432`, `REDIS_PORT=6379`는 호스트 공개 포트가 아니라 컨테이너 내부 통신 포트다.
- 운영 Compose 구성, Healthcheck, 볼륨, 외부 포트 공개 여부와 컨테이너 의존 관계는 S15P11A508-57에서 확정한다.

## GitLab CI/CD Variables

운영 배포와 DB Migration Pipeline은 Protected Variable인 `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`, `DEPLOY_HOST`, `DEPLOY_USER`만 사용해 EC2에 접속한다. `DB_PASSWORD`를 포함한 Runtime 환경변수는 GitLab에 등록하지 않고 서버의 `/opt/akkiljido/.env.prod`를 사용한다.
