import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("launchers compartilham host loopback e porta estável 47831", async () => {
  const [config, normal, bonus] = await Promise.all([
    readFile(new URL("configuracao-servidor.sh", root), "utf8"),
    readFile(new URL("iniciar-jogo.sh", root), "utf8"),
    readFile(new URL("abrir-bonus.sh", root), "utf8")
  ]);
  assert.match(config, /BOYPUNK_DEV_HOST=127\.0\.0\.1/);
  assert.match(config, /BOYPUNK_DEV_PORT=47831/);
  assert.match(normal, /\. "\$ROOT_DIR\/configuracao-servidor\.sh"/);
  assert.match(bonus, /\. "\$ROOT_DIR\/configuracao-servidor\.sh"/);
  assert.doesNotMatch(normal, /--port 0\b/);
  assert.match(bonus, /\?bonus-preview=1/);
});

test("servidor restringe host, expõe identidade do root e não escolhe porta alternativa", async () => {
  const server = await readFile(new URL("tools/server.mjs", root), "utf8");
  assert.match(server, /host !== "127\.0\.0\.1"/);
  assert.match(server, /server\.listen\(port, host/);
  assert.match(server, /pathname === "\/__boypunk_health"/);
  assert.match(server, /application: "boypunk-web-local-v1", version: GAME_VERSION, root/);
  assert.doesNotMatch(server, /server\.listen\(port, "0\.0\.0\.0"/);
});

test("UI oferece exportação e importação restritas aos saves do jogo", async () => {
  const [html, main] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("src/main.js", root), "utf8")
  ]);
  assert.match(html, /data-ui="export-saves"/);
  assert.match(html, /data-ui="import-saves"/);
  assert.match(main, /createSaveTransfer/);
  assert.match(main, /importSaveTransfer/);
});
