#!/bin/sh

set -eu

: "${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"
: "${CI_PIPELINE_ID:?CI_PIPELINE_ID is required}"
: "${CI_JOB_ID:?CI_JOB_ID is required}"
: "${CI_PROJECT_DIR:?CI_PROJECT_DIR is required}"
: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"

ssh_key="$HOME/.ssh/id_ed25519"
known_hosts="$HOME/.ssh/known_hosts"
migration_id="${CI_COMMIT_SHA}-${CI_PIPELINE_ID}-${CI_JOB_ID}"
local_package="${CI_PROJECT_DIR}/db-migrations-${migration_id}.tar.gz"
remote_package="/tmp/akkiljido-migrations-${migration_id}.tar.gz"
remote_dir="/tmp/akkiljido-migrations-${migration_id}"
compose_project="akkiljido-prod"
deploy_target="${DEPLOY_USER}@${DEPLOY_HOST}"

cleanup_local() {
  rm -f "$local_package"
}

trap cleanup_local 0
trap 'exit 1' 1 2 15

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

test -f "$ssh_key"
test -f "$known_hosts"
test -f "${CI_PROJECT_DIR}/scripts/apply-db-migrations.sh"

set -- scripts/apply-db-migrations.sh

if [ -d "${CI_PROJECT_DIR}/backend/db/migration" ]; then
  migration_files="$(
    find "${CI_PROJECT_DIR}/backend/db/migration" \
      -maxdepth 1 \
      -type f \
      -name '*.sql' \
      -print |
      LC_ALL=C sort
  )"

  if [ -n "$migration_files" ]; then
    while IFS= read -r migration_file; do
      relative_path="${migration_file#"${CI_PROJECT_DIR}/"}"
      set -- "$@" "$relative_path"
    done <<EOF
$migration_files
EOF
  fi
fi

tar -czf "$local_package" \
  -C "$CI_PROJECT_DIR" \
  "$@"

ssh_command \
  "REMOTE_DIR='$remote_dir' REMOTE_PACKAGE='$remote_package' sh -s" <<'REMOTE_PREFLIGHT'
set -eu

if [ -e "$REMOTE_DIR" ]; then
  echo "Migration directory already exists: $REMOTE_DIR" >&2
  exit 1
fi

if [ -e "$REMOTE_PACKAGE" ]; then
  echo "Migration package already exists: $REMOTE_PACKAGE" >&2
  exit 1
fi
REMOTE_PREFLIGHT

scp_command "$local_package" "${deploy_target}:${remote_package}"

ssh_command \
  "REMOTE_DIR='$remote_dir' REMOTE_PACKAGE='$remote_package' COMPOSE_PROJECT='$compose_project' sh -s" <<'REMOTE_MIGRATE'
set -eu

cleanup_remote() {
  case "$REMOTE_DIR" in
    /tmp/akkiljido-migrations-*)
      rm -rf -- "$REMOTE_DIR"
      ;;
    *)
      echo "Refusing to remove unexpected directory: $REMOTE_DIR" >&2
      ;;
  esac

  case "$REMOTE_PACKAGE" in
    /tmp/akkiljido-migrations-*.tar.gz)
      rm -f -- "$REMOTE_PACKAGE"
      ;;
    *)
      echo "Refusing to remove unexpected package: $REMOTE_PACKAGE" >&2
      ;;
  esac
}

trap cleanup_remote 0
trap 'exit 1' 1 2 15

mkdir "$REMOTE_DIR"
tar -xzf "$REMOTE_PACKAGE" -C "$REMOTE_DIR"

test -f "$REMOTE_DIR/scripts/apply-db-migrations.sh"

MIGRATION_DIR="$REMOTE_DIR/backend/db/migration" \
COMPOSE_PROJECT="$COMPOSE_PROJECT" \
  sh "$REMOTE_DIR/scripts/apply-db-migrations.sh"
REMOTE_MIGRATE
