#!/usr/bin/env bash
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$ROOT_DIR/configuracao-servidor.sh"
STATE_DIR="/tmp/boypunk-web-${UID}"
PORT_FILE="$STATE_DIR/server.port"

fail() {
  echo "Erro: $*" >&2
  exit 1
}

case "${1:-}" in
  --stop|--status)
    exec "$ROOT_DIR/iniciar-jogo.sh" "$1"
    ;;
  --no-open|"") ;;
  *) fail "opção desconhecida: $1 (use --no-open, --status ou --stop)" ;;
esac

if [ "${1:-}" != "--no-open" ]; then
  command -v xdg-open >/dev/null 2>&1 || fail "dependência necessária não encontrada: xdg-open"
fi

"$ROOT_DIR/iniciar-jogo.sh" --no-open

[ -r "$PORT_FILE" ] || fail "o servidor iniciou sem registrar a porta"
port=$(sed -n '1p' "$PORT_FILE")
case "$port" in
  ""|*[!0-9]*) fail "porta registrada inválida: $port" ;;
esac
[ "$port" = "$BOYPUNK_DEV_PORT" ] || fail "o servidor verificado não está na porta configurada $BOYPUNK_DEV_PORT"

URL="http://$BOYPUNK_DEV_HOST:$BOYPUNK_DEV_PORT/?bonus-preview=1"
echo "Câmara de Energia disponível em $URL"
echo "Prévia de desenvolvimento: progresso e recordes não serão alterados."
echo "Para encerrar: $ROOT_DIR/abrir-bonus.sh --stop"

if [ "${1:-}" != "--no-open" ]; then
  xdg-open "$URL" >/dev/null 2>&1 &
  echo "Abrindo a Câmara de Energia no navegador padrão…"
fi
