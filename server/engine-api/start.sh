#!/usr/bin/env bash
# The engine API's launcher — `yarn api:start` and `yarn api:test`.
#
#   start.sh [start]        serve on 127.0.0.1:${ENGINE_API_PORT:-8800}
#   start.sh test [args…]   run the tests (pytest args passed on)
#
# Makes `.venv` beside this script on the first run (Python ≥ 3.11, `PYTHON`
# picks the interpreter) and reinstalls only when the requirements change.
set -euo pipefail

dir="$(cd "$(dirname "$0")" && pwd)"
venv="$dir/.venv"

if [ ! -x "$venv/bin/python" ]; then
  echo "engine-api: creating $venv"
  "${PYTHON:-python3}" -m venv "$venv"
fi

stamp="$venv/.requirements.sha256"
want="$(cat "$dir/requirements.txt" "$dir/requirements-dev.txt" | sha256sum | cut -d' ' -f1)"
if [ "$(cat "$stamp" 2>/dev/null)" != "$want" ]; then
  echo "engine-api: installing requirements"
  "$venv/bin/python" -m pip install --quiet --upgrade pip
  "$venv/bin/python" -m pip install --quiet -r "$dir/requirements-dev.txt"
  echo "$want" > "$stamp"
fi

command="${1:-start}"
case "$command" in
  start)
    exec "$venv/bin/python" -m uvicorn engine_api.app:create_app --factory \
      --app-dir "$dir" --host 127.0.0.1 --port "${ENGINE_API_PORT:-8800}"
    ;;
  test)
    shift
    cd "$dir"
    exec "$venv/bin/python" -m pytest tests "$@"
    ;;
  *)
    echo "usage: start.sh [start | test [pytest args…]]" >&2
    exit 2
    ;;
esac
