#!/bin/sh

set -eu

migration_dir="${MIGRATION_DIR:-backend/db/migration}"
compose_project="${COMPOSE_PROJECT:-akkiljido-prod}"

docker_command() {
  if [ -n "${DB_MIGRATION_DOCKER_BIN:-}" ]; then
    "$DB_MIGRATION_DOCKER_BIN" "$@"
  else
    sudo -n docker "$@"
  fi
}

if [ -n "${DB_MIGRATION_POSTGRES_CONTAINER:-}" ]; then
  postgres_container="$DB_MIGRATION_POSTGRES_CONTAINER"
else
  postgres_containers="$(
    docker_command ps \
      --filter "label=com.docker.compose.project=$compose_project" \
      --filter "label=com.docker.compose.service=postgres" \
      --format '{{.ID}}'
  )"
  postgres_count="$(
    printf '%s\n' "$postgres_containers" |
      awk 'NF { count++ } END { print count + 0 }'
  )"

  if [ "$postgres_count" -ne 1 ]; then
    echo "[DB Migration] expected one PostgreSQL container, found $postgres_count" >&2
    exit 1
  fi

  postgres_container="$postgres_containers"
fi

if [ "$(docker_command inspect --format '{{.State.Status}}' "$postgres_container")" != "running" ]; then
  echo "[DB Migration] PostgreSQL container is not running" >&2
  exit 1
fi

if [ "$(docker_command inspect --format '{{.State.Health.Status}}' "$postgres_container")" != "healthy" ]; then
  echo "[DB Migration] PostgreSQL container is not healthy" >&2
  exit 1
fi

db_user="$(
  docker_command exec "$postgres_container" \
    sh -c 'printf "%s" "$POSTGRES_USER"'
)"
db_name="$(
  docker_command exec "$postgres_container" \
    sh -c 'printf "%s" "$POSTGRES_DB"'
)"

if [ -z "$db_user" ] || [ -z "$db_name" ]; then
  echo "[DB Migration] PostgreSQL database metadata is unavailable" >&2
  exit 1
fi

psql_exec() {
  docker_command exec -i "$postgres_container" \
    psql \
    --no-psqlrc \
    --set=ON_ERROR_STOP=1 \
    --username "$db_user" \
    --dbname "$db_name" \
    "$@"
}

psql_exec <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

if [ ! -d "$migration_dir" ]; then
  echo "[DB Migration] no migration files"
  echo "[DB Migration] completed"
  exit 0
fi

migration_list="$(mktemp)"

cleanup_list() {
  rm -f "$migration_list"
}

trap cleanup_list 0
trap 'exit 1' 1 2 15

find "$migration_dir" \
  -maxdepth 1 \
  -type f \
  -name '*.sql' \
  -print |
  LC_ALL=C sort >"$migration_list"

if [ ! -s "$migration_list" ]; then
  echo "[DB Migration] no migration files"
  echo "[DB Migration] completed"
  exit 0
fi

previous_sequence=""

while IFS= read -r migration_file; do
  filename="${migration_file##*/}"

  if ! printf '%s\n' "$filename" |
    grep -Eq '^[0-9]{3}__[A-Za-z0-9][A-Za-z0-9_-]*\.sql$'
  then
    echo "[DB Migration] invalid filename: $filename" >&2
    exit 1
  fi

  sequence="${filename%%__*}"
  if [ "$sequence" = "$previous_sequence" ]; then
    echo "[DB Migration] duplicate sequence: $sequence" >&2
    exit 1
  fi
  previous_sequence="$sequence"

  checksum="$(sha256sum "$migration_file" | awk '{ print $1 }')"
  existing_checksum="$(
    printf '%s\n' \
      "SELECT checksum FROM schema_migrations WHERE filename = :'filename';" |
      psql_exec \
        --tuples-only \
        --no-align \
        --quiet \
        --set="filename=$filename"
  )"

  if [ -n "$existing_checksum" ]; then
    if [ "$existing_checksum" = "$checksum" ]; then
      echo "[DB Migration] $filename - SKIP"
      continue
    fi

    echo "[DB Migration] $filename - CHECKSUM MISMATCH" >&2
    exit 1
  fi

  echo "[DB Migration] $filename - APPLY"

  {
    printf 'BEGIN;\n'
    printf 'LOCK TABLE schema_migrations IN EXCLUSIVE MODE;\n'
    cat "$migration_file"
    printf '\n'
    cat <<'SQL'
INSERT INTO schema_migrations (filename, checksum)
VALUES (:'filename', :'checksum');
COMMIT;
SQL
  } |
    psql_exec \
      --set="filename=$filename" \
      --set="checksum=$checksum"
done <"$migration_list"

echo "[DB Migration] completed"
