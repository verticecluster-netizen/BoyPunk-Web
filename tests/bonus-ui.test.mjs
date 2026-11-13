import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("HTML expõe transição, skip acessível, resultado e três rotas de saída", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="screen-bonus-transition"/);
  assert.match(html, />Bônus conquistado!</);
  assert.match(html, /data-ui="skip-bonus"/);
  assert.match(html, /id="screen-bonus-complete"/);
  assert.match(html, /data-ui="bonus-continue-next"/);
  assert.match(html, /data-ui="bonus-replay"/);
  assert.match(html, /data-ui="menu"/);
});

test("bundle futuro inclui regras de bônus antes dos consumidores sem gerar artefato", async () => {
  const buildSource = await readFile(new URL("../tools/build-portable.mjs", import.meta.url), "utf8");
  assert.match(buildSource, /"config\.js", "bonus\.js", "level-data\.js"/);
  assert.ok(buildSource.indexOf('"bonus.js"') < buildSource.indexOf('"core.js"'));
  assert.ok(buildSource.indexOf('"bonus.js"') < buildSource.indexOf('"progression.js"'));
  assert.ok(buildSource.indexOf('"save-transfer.js"') < buildSource.indexOf('"main.js"'));
});

test("rota e launcher de prévia são exclusivos de desenvolvimento e reutilizam o servidor", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  const launcher = await readFile(new URL("../abrir-bonus.sh", import.meta.url), "utf8");
  assert.match(main, /query\.get\("bonus-preview"\) === "1"/);
  assert.match(main, /location\.protocol === "http:"/);
  assert.match(main, /"127\.0\.0\.1", "localhost"/);
  assert.match(main, /model\.startBonusPreview\(BALANCE\.levels\.currentId, selectedCharacter\)/);
  assert.match(main, /event\.target !== canvas[\s\S]*?!isPrimaryMouseAttackPointer\(event\)[\s\S]*?input\.pulse\("attack"\)/);
  assert.match(main, /if \(directBonusPreview\) startBonusPreview\(\)/);
  assert.match(main, /event\.progressionEligible\s*\? progression\.recordBonusResult/);
  assert.match(launcher, /iniciar-jogo\.sh" --no-open/);
  assert.match(launcher, /\?bonus-preview=1/);
});

test("perda de foco inclui bonusPlaying, limpa inputs e congela o fixed-step", async () => {
  const [main, input] = await Promise.all([
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../src/input.js", import.meta.url), "utf8")
  ]);
  assert.match(main, /\["playing", "bonusPlaying", "survival"\]\.includes\(model\.state\).*model\.pause\(\)/);
  assert.match(input, /visibilitychange[\s\S]*document\.hidden[\s\S]*this\.clear\(true\)/);
  assert.match(main, /visibilitychange[\s\S]*input\.clear\(\)[\s\S]*accumulator = 0[\s\S]*lastTime = performance\.now\(\)/);
});
