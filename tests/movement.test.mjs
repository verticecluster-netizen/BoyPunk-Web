import assert from "node:assert/strict";
import test from "node:test";
import { GameModel } from "../src/core.js";
import { BALANCE } from "../src/config.js";

const STEP = 1 / 120;

test("coyote time permite salto simples dentro da janela após abandonar plataforma", () => {
  const model = new GameModel();
  model.startRun({ levelId: "district-neon" });
  model.player.x = 100;
  model.player.y = 128;
  model.player.onGround = true;

  // Dá um passo no ar sem chão (queda inicial com coyote ativo)
  model.player.onGround = false;
  model.player.coyote = 0.05; // dentro de coyoteTime (0.09s)
  model.player.jumpsUsed = 0;

  model.update(STEP, { jumpPressed: true, jumpHeld: true });

  assert.equal(model.player.jumpsUsed, 1, "deve consumir o primeiro salto (salto simples)");
  // vy inicial -310 + gravidade em 1 tick (950 * 1/120 = 7.9167 px/s)
  const expectedVy = -BALANCE.player.jumpSpeed + BALANCE.player.gravity * STEP;
  assert.ok(Math.abs(model.player.vy - expectedVy) < 0.001, "deve aplicar velocidade de salto simples integrada com gravidade");
  assert.equal(model.player.coyote, 0, "coyote deve ser zerado após saltar");
});

test("coyote time expirado impede salto simples mas permite salto duplo no ar", () => {
  const model = new GameModel();
  model.startRun({ levelId: "district-neon" });
  model.player.onGround = false;
  model.player.coyote = 0; // expirado
  model.player.jumpsUsed = 0;

  model.update(STEP, { jumpPressed: true, jumpHeld: true });

  assert.equal(model.player.jumpsUsed, 2, "deve pular direto para o salto duplo");
  const expectedVy = -BALANCE.player.doubleJumpSpeed + BALANCE.player.gravity * STEP;
  assert.ok(Math.abs(model.player.vy - expectedVy) < 0.001, "deve aplicar velocidade de salto duplo integrada com gravidade");
});

test("jump buffer retém o comando de salto antes do pouso e dispara ao aterrissar", () => {
  const model = new GameModel();
  model.startRun({ levelId: "district-neon" });
  // Jogador em queda após ter gasto o salto duplo (sem saltos disponíveis no ar)
  model.player.x = 100;
  model.player.y = 200;
  model.player.vy = 120;
  model.player.onGround = false;
  model.player.coyote = 0;
  model.player.jumpsUsed = 2; // esgotou saltos no ar

  // Pressiona pulo 60ms antes de tocar no chão (dentro do buffer de 120ms)
  model.update(STEP, { jumpPressed: true, jumpHeld: true });
  assert.ok(model.player.jumpBuffer > 0, "buffer de salto deve ficar armazenado");

  // Toca o chão no tick seguinte
  model.player.onGround = true;
  model.player.coyote = BALANCE.player.coyoteTime;
  model.player.jumpsUsed = 0;
  model.update(STEP, { jumpHeld: true });

  assert.equal(model.player.jumpsUsed, 1, "deve consumir o buffer e saltar no primeiro frame no chão");
  assert.equal(model.player.jumpBuffer, 0, "buffer deve ser zerado após disparo");
});

test("salto contínuo atinge ápice máximo enquanto corte antecipado reduz altura do salto", () => {
  // 1. Salto completo (jumpHeld: true sustentado)
  const fullJumpModel = new GameModel();
  fullJumpModel.startRun({ levelId: "district-neon" });
  const startY = fullJumpModel.player.y;
  let minFullY = startY;

  // Primeiro frame com comando de salto
  fullJumpModel.update(STEP, { jumpPressed: true, jumpHeld: true });
  for (let f = 0; f < 60; f++) {
    fullJumpModel.update(STEP, { jumpHeld: true });
    if (fullJumpModel.player.y < minFullY) minFullY = fullJumpModel.player.y;
  }
  const fullApex = startY - minFullY;

  // 2. Salto curto (jumpHeld solto imediatamente após o primeiro frame)
  const shortJumpModel = new GameModel();
  shortJumpModel.startRun({ levelId: "district-neon" });
  let minShortY = startY;

  shortJumpModel.update(STEP, { jumpPressed: true, jumpHeld: true });
  for (let f = 0; f < 60; f++) {
    shortJumpModel.update(STEP, { jumpHeld: false }); // soltou
    if (shortJumpModel.player.y < minShortY) minShortY = shortJumpModel.player.y;
  }
  const shortApex = startY - minShortY;

  assert.ok(fullApex > 48 && fullApex < 54, `ápice total deve ficar próximo a 50.58 px (medido: ${fullApex.toFixed(2)} px)`);
  assert.ok(shortApex < 26, `ápice curto deve ser substancialmente menor (medido: ${shortApex.toFixed(2)} px)`);
  assert.ok(fullApex > shortApex * 1.8, "salto sustentado deve ser no mínimo 80% mais alto que micro-hop");
});

test("velocidade horizontal do jogador nunca excede maxSpeed (150 px/s)", () => {
  const model = new GameModel();
  model.startRun({ levelId: "district-neon" });

  for (let f = 0; f < 120; f++) {
    model.update(STEP, { right: true });
    assert.ok(Math.abs(model.player.vx) <= BALANCE.player.maxSpeed + 0.0001,
      `vx ${model.player.vx} não pode ultrapassar maxSpeed (${BALANCE.player.maxSpeed})`);
  }
  assert.equal(Math.round(model.player.vx), BALANCE.player.maxSpeed, "deve atingir velocidade máxima exata");
});

test("desaceleração por atrito para o jogador limpamente em repouso ao soltar direcionais", () => {
  const model = new GameModel();
  model.startRun({ levelId: "district-neon" });
  // Acelera até velocidade máxima
  for (let f = 0; f < 30; f++) model.update(STEP, { right: true });
  assert.equal(Math.round(model.player.vx), BALANCE.player.maxSpeed);

  // Solta direcionais e observa parada
  for (let f = 0; f < 30; f++) model.update(STEP, {});
  assert.equal(model.player.vx, 0, "deve parar completamente (vx = 0)");
});
