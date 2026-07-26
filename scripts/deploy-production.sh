#!/bin/sh

set -eu

: "${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"
: "${CI_PIPELINE_ID:?CI_PIPELINE_ID is required}"
: "${CI_PROJECT_DIR:?CI_PROJECT_DIR is required}"
: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"

ssh_key="$HOME/.ssh/id_ed25519"
known_hosts="$HOME/.ssh/known_hosts"
release_id="${CI_COMMIT_SHA}-${CI_PIPELINE_ID}"
local_package="${CI_PROJECT_DIR}/deployment-${release_id}.tar.gz"
remote_package="/tmp/akkiljido-${release_id}.tar.gz"
release_dir="/opt/akkiljido/releases/${release_id}"
compose_file="${release_dir}/infra/compose.prod.yml"
env_file="/opt/akkiljido/.env.prod"
compose_project="akkiljido-prod"
deploy_target="${DEPLOY_USER}@${DEPLOY_HOST}"
external_health_file="${CI_PROJECT_DIR}/external-health.json"

cleanup_local() {
  rm -f "$local_package" "$external_health_file"
}

trap cleanup_local EXIT

ssh_command() {
  ssh \
    -i "$ssh_key" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=yes \
    "$deploy_target" \
    "$@"
}

scp_command() {
  scp \
    -i "$ssh_key" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=yes \
    "$@"
}

test -f "${CI_PROJECT_DIR}/backend/Dockerfile"
test -f "${CI_PROJECT_DIR}/infra/compose.prod.yml"
test -f "$ssh_key"
test -f "$known_hosts"

tar -czf "$local_package" \
  --exclude='backend/.env' \
  --exclude='backend/.env.*' \
  --exclude='backend/.gradle' \
  --exclude='backend/build' \
  -C "$CI_PROJECT_DIR" \
  backend \
  infra/compose.prod.yml

ssh_command \
  "RELEASE_DIR='$release_dir' REMOTE_PACKAGE='$remote_package' sh -s" <<'REMOTE_PREFLIGHT'
set -eu

if [ -e "$RELEASE_DIR" ]; then
  echo "Release directory already exists: $RELEASE_DIR" >&2
  exit 1
fi

if [ -e "$REMOTE_PACKAGE" ]; then
  echo "Remote package already exists: $REMOTE_PACKAGE" >&2
  exit 1
fi

mkdir -p /opt/akkiljido/releases
REMOTE_PREFLIGHT

scp_command "$local_package" "${deploy_target}:${remote_package}"

ssh_command \
  "RELEASE_DIR='$release_dir' REMOTE_PACKAGE='$remote_package' sh -s" <<'REMOTE_RELEASE'
set -eu

mkdir "$RELEASE_DIR"
tar -xzf "$REMOTE_PACKAGE" -C "$RELEASE_DIR"

test -f "$RELEASE_DIR/backend/Dockerfile"
test -f "$RELEASE_DIR/infra/compose.prod.yml"

rm -f "$REMOTE_PACKAGE"
REMOTE_RELEASE

ssh_command \
  "RELEASE_DIR='$release_dir' COMPOSE_FILE='$compose_file' ENV_FILE='$env_file' COMPOSE_PROJECT='$compose_project' sh -s" <<'REMOTE_DEPLOY'
set -eu

compose() {
  sudo -n docker compose \
    -p "$COMPOSE_PROJECT" \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    "$@"
}

compose config >/dev/null

postgres_id_before="$(compose ps -q postgres)"
redis_id_before="$(compose ps -q redis)"

if [ -z "$postgres_id_before" ] || [ -z "$redis_id_before" ]; then
  echo "PostgreSQL or Redis container was not found." >&2
  exit 1
fi

postgres_restart_before="$(
  sudo -n docker inspect --format '{{.RestartCount}}' "$postgres_id_before"
)"
redis_restart_before="$(
  sudo -n docker inspect --format '{{.RestartCount}}' "$redis_id_before"
)"

compose up -d --build --no-deps backend

attempt=1
health_body=""

while [ "$attempt" -le 20 ]; do
  if health_body="$(
    curl -fsS --max-time 1 \
      http://127.0.0.1:8080/api/health \
      2>/dev/null
  )" && printf '%s' "$health_body" |
    grep -Eq '"status"[[:space:]]*:[[:space:]]*"UP"'
  then
    break
  fi

  if [ "$attempt" -eq 20 ]; then
    echo "Backend health check failed after 20 attempts." >&2
    exit 1
  fi

  sleep 2
  attempt=$((attempt + 1))
done

echo "Internal backend health check passed: $health_body"

backend_id="$(compose ps -q backend)"
postgres_id_after="$(compose ps -q postgres)"
redis_id_after="$(compose ps -q redis)"

if [ -z "$backend_id" ] ||
  [ "$(sudo -n docker inspect --format '{{.State.Status}}' "$backend_id")" != "running" ]
then
  echo "Backend container is not running." >&2
  exit 1
fi

if [ "$postgres_id_before" != "$postgres_id_after" ]; then
  echo "PostgreSQL container was unexpectedly recreated." >&2
  exit 1
fi

if [ "$redis_id_before" != "$redis_id_after" ]; then
  echo "Redis container was unexpectedly recreated." >&2
  exit 1
fi

if [ "$(sudo -n docker inspect --format '{{.State.Health.Status}}' "$postgres_id_after")" != "healthy" ]; then
  echo "PostgreSQL container is not healthy." >&2
  exit 1
fi

if [ "$(sudo -n docker inspect --format '{{.State.Health.Status}}' "$redis_id_after")" != "healthy" ]; then
  echo "Redis container is not healthy." >&2
  exit 1
fi

if [ "$postgres_restart_before" != "$(
  sudo -n docker inspect --format '{{.RestartCount}}' "$postgres_id_after"
)" ]; then
  echo "PostgreSQL restart count changed." >&2
  exit 1
fi

if [ "$redis_restart_before" != "$(
  sudo -n docker inspect --format '{{.RestartCount}}' "$redis_id_after"
)" ]; then
  echo "Redis restart count changed." >&2
  exit 1
fi

if [ -n "$(sudo -n docker port "$postgres_id_after")" ]; then
  echo "PostgreSQL has an unexpected host port binding." >&2
  exit 1
fi

if [ -n "$(sudo -n docker port "$redis_id_after")" ]; then
  echo "Redis has an unexpected host port binding." >&2
  exit 1
fi

systemctl is-active --quiet nginx
systemctl is-active --quiet gerrit
systemctl is-active --quiet httpd
ss -lnt | grep -q ':8989'

echo "Backend deployment and protected service checks passed."
echo "Release directory preserved at: $RELEASE_DIR"
REMOTE_DEPLOY

external_status="$(
  curl \
    --silent \
    --show-error \
    --max-time 15 \
    --output "$external_health_file" \
    --write-out '%{http_code}' \
    https://i15a508.p.ssafy.io/api/health
)"

if [ "$external_status" != "200" ]; then
  echo "External health check returned HTTP $external_status." >&2
  exit 1
fi

if ! grep -Eq '"status"[[:space:]]*:[[:space:]]*"UP"' "$external_health_file"; then
  echo "External health response did not report UP." >&2
  exit 1
fi

echo "External backend health check passed with HTTP 200."
