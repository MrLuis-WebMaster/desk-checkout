#!/bin/sh
set -eu

# Dist-only migrate then start. Never run tsc in the container.
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/apps/api"
cd "$API_DIR"

TYPEORM_BIN="$ROOT/node_modules/.bin/typeorm"
if [ ! -x "$TYPEORM_BIN" ]; then
  TYPEORM_BIN="$API_DIR/node_modules/.bin/typeorm"
fi
if [ ! -x "$TYPEORM_BIN" ]; then
  TYPEORM_BIN="node $ROOT/node_modules/typeorm/cli.js"
fi

echo "Running TypeORM migrations from dist..."
# shellcheck disable=SC2086
$TYPEORM_BIN migration:run -d dist/shared/infrastructure/persistence/typeorm.data-source.js

echo "Starting API..."
exec node dist/main.js
