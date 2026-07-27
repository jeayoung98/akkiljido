# 운영 DB Migration

운영 PostgreSQL의 Schema 변경은 GitLab CI/CD의 `production-db-migrate` Job이 EC2에 SSH로 접속한 뒤, 기존 PostgreSQL Container 내부의 `psql`로 적용한다. GitLab Runner는 운영 DB에 직접 연결하지 않으며 DB Secret은 서버의 `/opt/akkiljido/.env.prod`에서만 관리한다.

## Migration 파일

- 위치: `backend/db/migration/`
- 이름: `NNN__description.sql`
- 예시: `001__init.sql`, `002__create_users.sql`
- 파일명 오름차순으로 실행한다.
- description은 영문자, 숫자, `_`, `-`만 사용한다.

운영에 적용된 Migration 파일은 수정하지 않는다. 추가 변경은 다음 번호의 새 SQL 파일로 작성하며 SQL 안에 비밀번호, Token 등 Secret을 기록하지 않는다.

자동 Migration은 기존 Backend와 호환되는 Schema 변경을 원칙으로 한다. `DROP TABLE`, `DROP COLUMN`, `RENAME COLUMN`, 기존 Column Type 변경 등 호환성을 깨는 변경은 자동 적용 전에 Backend 배포 순서를 별도로 검토한다.

## 적용 규칙

- main Merge 후 `backend-test`가 성공하면 미실행 SQL만 자동 적용한다.
- 적용 이력은 운영 DB의 `schema_migrations` 테이블에 파일명, SHA-256 checksum, 적용 시각으로 기록한다.
- 동일 파일명과 checksum은 건너뛰고, 적용된 파일의 checksum이 바뀌면 Pipeline을 실패시킨다.
- 각 SQL과 이력 기록은 하나의 Transaction으로 처리한다.
- Migration 실패 시 `production-deploy`는 실행되지 않는다.

Migration SQL은 PostgreSQL Transaction 안에서 실행 가능한 DDL을 사용한다. SQL 파일 안에 별도의 `BEGIN`, `COMMIT`, `ROLLBACK`이나 psql 메타 명령을 작성하지 않는다.
