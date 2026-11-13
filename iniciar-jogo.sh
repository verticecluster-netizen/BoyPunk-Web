#!/usr/bin/env bash
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$ROOT_DIR/configuracao-servidor.sh"
STATE_BASE=/tmp
STATE_DIR="$STATE_BASE/boypunk-web-${UID}"
PID_FILE="$STATE_DIR/server.pid"
PORT_FILE="$STATE_DIR/server.port"
LOG_FILE="$STATE_DIR/server.log"
HEALTH_MARKER="boypunk-web-local-v1"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR" 2>/dev/null || true
: > "$STATE_DIR/.write-test"
rm -f "$STATE_DIR/.write-test"

fail() {
  echo "Erro: $*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || fail "dependência necessária não encontrada: $1"
}

pid_matches_game() {
  pid=$1
  [ -n "$pid" ] || return 1
  case "$pid" in *[!0-9]*) return 1 ;; esac
  kill -0 "$pid" 2>/dev/null || return 1
  [ -r "/proc/$pid/cmdline" ] || return 1
  command_line=$(tr '\000' ' ' < "/proc/$pid/cmdline")
  case "$command_line" in
    *"node"*"tools/server.mjs"*"--root $ROOT_DIR"*) return 0 ;;
    *"node"*"tools/server.mjs"*"--root ."*)
      [ -r "/proc/$pid/cwd" ] && [ "$(readlink -f "/proc/$pid/cwd")" = "$ROOT_DIR" ] && return 0
      return 1
      ;;
    *) return 1 ;;
  esac
}

health_ok() {
  port=$1
  PORT_TO_CHECK="$port" HOST_TO_CHECK="$BOYPUNK_DEV_HOST" ROOT_TO_CHECK="$ROOT_DIR" HEALTH_TO_CHECK="$HEALTH_MARKER" node -e '
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    fetch(`http://${process.env.HOST_TO_CHECK}:${process.env.PORT_TO_CHECK}/__boypunk_health`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("HTTP")))
      .then((data) => process.exit(data.application === process.env.HEALTH_TO_CHECK
        && data.root === process.env.ROOT_TO_CHECK
        && data.host === process.env.HOST_TO_CHECK
        && String(data.port) === process.env.PORT_TO_CHECK ? 0 : 1))
      .catch(() => process.exit(1))
      .finally(() => clearTimeout(timer));
  ' >/dev/null 2>&1
}

stop_server() {
  if [ ! -f "$PID_FILE" ]; then
    echo "Nenhum servidor registrado para BoyPunk!."
    return 0
  fi
  pid=$(cat "$PID_FILE" 2>/dev/null || true)
  if pid_matches_game "$pid"; then
    kill "$pid"
    count=0
    while kill -0 "$pid" 2>/dev/null && [ "$count" -lt 30 ]; do
      sleep 0.1
      count=$((count + 1))
    done
    echo "Servidor BoyPunk! encerrado (PID $pid)."
  else
    echo "Registro antigo removido; nenhum processo do jogo foi encerrado."
  fi
  rm -f "$PID_FILE" "$PORT_FILE"
}

need node
[ -f "$ROOT_DIR/index.html" ] || fail "index.html não encontrado em $ROOT_DIR"
[ -f "$ROOT_DIR/health.json" ] || fail "health.json não encontrado em $ROOT_DIR"
if [ "${1:-}" != "--no-open" ] && [ "${1:-}" != "--status" ] && [ "${1:-}" != "--stop" ]; then
  need xdg-open
fi

case "${1:-}" in
  --stop)
    stop_server
    exit 0
    ;;
  --status)
    if [ -f "$PID_FILE" ] && [ -f "$PORT_FILE" ]; then
      pid=$(cat "$PID_FILE" 2>/dev/null || true)
      port=$(cat "$PORT_FILE" 2>/dev/null || true)
      if pid_matches_game "$pid" && health_ok "$port"; then
        echo "BoyPunk! ativo em http://$BOYPUNK_DEV_HOST:$port/ (PID $pid)"
        exit 0
      fi
    fi
    echo "BoyPunk! não está ativo."
    exit 1
    ;;
  --no-open|"") ;;
  *) fail "opção desconhecida: $1 (use --no-open, --status ou --stop)" ;;
esac

pid=""
port=""
if [ -f "$PID_FILE" ] && [ -f "$PORT_FILE" ]; then
  pid=$(cat "$PID_FILE" 2>/dev/null || true)
  port=$(cat "$PORT_FILE" 2>/dev/null || true)
fi

if pid_matches_game "$pid" && health_ok "$port" && [ "$port" = "$BOYPUNK_DEV_PORT" ]; then
  echo "Reutilizando servidor BoyPunk! existente (PID $pid)."
elif pid_matches_game "$pid" && health_ok "$port"; then
  fail "há um servidor deste projeto ativo no endereço antigo http://$BOYPUNK_DEV_HOST:$port/. Exporte os saves nessa origem antes de encerrá-lo com '$ROOT_DIR/iniciar-jogo.sh --stop'."
else
  rm -f "$PID_FILE" "$PORT_FILE"
  nohup node "$ROOT_DIR/tools/server.mjs" --root "$ROOT_DIR" --host "$BOYPUNK_DEV_HOST" --port "$BOYPUNK_DEV_PORT" >"$LOG_FILE" 2>&1 &
  pid=$!
  printf '%s\n' "$pid" > "$PID_FILE"

  attempt=0
  while [ "$attempt" -lt 60 ]; do
    if [ -f "$PORT_FILE" ]; then port=$(cat "$PORT_FILE" 2>/dev/null || true); else port=""; fi
    if [ "$port" = "$BOYPUNK_DEV_PORT" ] && pid_matches_game "$pid" && health_ok "$port"; then break; fi
    if ! kill -0 "$pid" 2>/dev/null; then
      tail -n 20 "$LOG_FILE" >&2 || true
      rm -f "$PID_FILE" "$PORT_FILE"
      if grep -q "EADDRINUSE" "$LOG_FILE" 2>/dev/null; then
        fail "a porta $BOYPUNK_DEV_PORT pertence a outro aplicativo. Nenhum processo foi encerrado e nenhuma porta alternativa foi escolhida"
      fi
      fail "não foi possível vincular o servidor a http://$BOYPUNK_DEV_HOST:$BOYPUNK_DEV_PORT/. Consulte $LOG_FILE; nenhum processo foi encerrado e nenhuma porta alternativa foi escolhida"
    fi
    sleep 0.1
    attempt=$((attempt + 1))
  done
  if [ "$port" != "$BOYPUNK_DEV_PORT" ] || ! health_ok "$port"; then
    tail -n 20 "$LOG_FILE" >&2 || true
    rm -f "$PID_FILE" "$PORT_FILE"
    fail "o servidor iniciou, mas o jogo não respondeu corretamente"
  fi
  echo "Servidor BoyPunk! iniciado (PID $pid)."
fi

URL="http://$BOYPUNK_DEV_HOST:$BOYPUNK_DEV_PORT/"
echo "BoyPunk! disponível em $URL"
echo "Para encerrar: $ROOT_DIR/iniciar-jogo.sh --stop"

if [ "${1:-}" != "--no-open" ]; then
  xdg-open "$URL" >/dev/null 2>&1 &
  echo "Abrindo no navegador padrão…"
fi
