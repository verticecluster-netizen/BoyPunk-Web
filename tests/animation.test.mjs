import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE } from "../src/config.js";
import { GameModel } from "../src/core.js";
import {
  advanceAnimationClock,
  animationFrame,
  CHASER_ANIMATIONS,
  chaserAnimationState,
  PLAYER_ANIMATIONS,
  playerAnimationState
} from "../src/animation.js";

test("animation state selection follows gameplay movement, action and terminal states", () => {
  const player = { life: 4, attackTimer: 0, hurtFlash: 0, onGround: true, vx: 0, vy: 0 };
  assert.equal(playerAnimationState(player), "idle");
  player.vx = 100;
  assert.equal(playerAnimationState(player), "walk");
  player.onGround = false;
  player.vy = -1;
  assert.equal(playerAnimationState(player), "jump");
  player.vy = 1;
  assert.equal(playerAnimationState(player), "fall");
  player.hurtFlash = 0.1;
  assert.equal(playerAnimationState(player), "hurt");
  player.attackTimer = 0.1;
  assert.equal(playerAnimationState(player), "attack1");
  player.life = 0;
  assert.equal(playerAnimationState(player), "die", "derrota tem prioridade sobre ataque e dano");

  const chaser = { dying: false, attackFlash: 0, onGround: true, vx: 0 };
  assert.equal(chaserAnimationState(chaser), "idle");
  chaser.vx = -52;
  assert.equal(chaserAnimationState(chaser), "walk");
  chaser.onGround = false;
  assert.equal(chaserAnimationState(chaser), "jump");
  chaser.attackFlash = 0.1;
  assert.equal(chaserAnimationState(chaser), "attack");
  chaser.dying = true;
  assert.equal(chaserAnimationState(chaser), "dead");
});

test("animation clocks reset only at state transitions and frame rates use simulation time", () => {
  const entity = { animState: "idle", animTime: 0.4 };
  advanceAnimationClock(entity, "walk", 1 / 60);
  assert.equal(entity.animState, "walk");
  assert.equal(entity.animTime, 0);
  advanceAnimationClock(entity, "walk", 0.25);
  assert.equal(entity.animTime, 0.25);
  assert.equal(animationFrame(entity, CHASER_ANIMATIONS.walk), 3);
  assert.equal(animationFrame(entity, PLAYER_ANIMATIONS.walk), 3);
  advanceAnimationClock(entity, "idle", 0.1);
  assert.equal(entity.animTime, 0);
  advanceAnimationClock(entity, "idle", 0.25);
  assert.equal(animationFrame(entity, CHASER_ANIMATIONS.idle), 0);
});

test("janela de ataque do perseguidor percorre os quatro índices configurados", () => {
  const entity = { animState: "attack", animTime: 0 };
  const sampledFrames = [0, 1, 2, 3].map((frame) => {
    entity.animTime = frame / CHASER_ANIMATIONS.attack.speed;
    return animationFrame(entity, CHASER_ANIMATIONS.attack);
  });
  assert.deepEqual(sampledFrames, [0, 1, 2, 3]);
});

test("ataque do jogador emite no frame zero e alcança impacto visual sem alterar a janela", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.nextSpawnAt = Infinity;
  model.update(1 / 120, { attackPressed: true });
  assert.equal(model.projectiles.length, 1, "o tiro continua responsivo no tick aceito");
  assert.equal(animationFrame(model.player, PLAYER_ANIMATIONS.attack1), 0);
  assert.equal(model.player.attackTimer, BALANCE.player.attackDuration);

  for (let tick = 0; tick < 11; tick += 1) model.update(1 / 120, {});
  assert.equal(animationFrame(model.player, PLAYER_ANIMATIONS.attack1), 2);
  assert.ok(model.player.attackTimer > 0, "o frame de contato pertence à mesma janela de 0,18 s");
  assert.equal(model.player.attackCooldown > 0, true);
});

test("animações terminais não reiniciam e travam no último quadro", () => {
  assert.deepEqual(PLAYER_ANIMATIONS.die, { frames: 4, speed: 10, loop: false });
  assert.deepEqual(CHASER_ANIMATIONS.dead, { frames: 4, speed: 12, loop: false });
  assert.equal(animationFrame({ animTime: 0.31 }, PLAYER_ANIMATIONS.die), 3);
  assert.equal(animationFrame({ animTime: 8 }, PLAYER_ANIMATIONS.die), 3);
  assert.equal(animationFrame({ animTime: 8 }, CHASER_ANIMATIONS.dead), 3);
});

test("two chasers keep independent walk clocks and pause freezes both", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.nextSpawnAt = Infinity;
  model.player.x = 230;
  model.player.y = 208;
  model.player.onGround = true;
  model.spawnChaser();
  model.spawnChaser();
  const [left, right] = model.enemies;
  Object.assign(left, { x: 80, y: 208, onGround: true });
  Object.assign(right, { x: 400, y: 208, onGround: true });
  model.update(1 / 120, {});
  model.update(1 / 120, {});
  assert.equal(left.animState, "walk");
  assert.equal(right.animState, "walk");
  right.animTime = 0.2;
  for (let i = 0; i < 30; i += 1) model.update(1 / 120, {});
  assert.equal(chaserAnimationState(left), "walk");
  assert.equal(chaserAnimationState(right), "walk");
  assert.ok(left.animTime > 0.2 && right.animTime > 0.2);
  assert.notEqual(left.animTime, right.animTime);
  assert.equal(left.facing, 1);
  assert.equal(right.facing, -1);

  model.pause();
  const clocks = [left.animTime, right.animTime, model.player.animTime];
  for (let i = 0; i < 120; i += 1) model.update(1 / 60, {});
  assert.deepEqual([left.animTime, right.animTime, model.player.animTime], clocks);
  model.resume();
  model.update(1 / 60, {});
  assert.ok(left.animTime > clocks[0] && right.animTime > clocks[1]);
});

test("new run starts player and enemy animation clocks cleanly", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.player.animState = "walk";
  model.player.animTime = 0.7;
  model.spawnChaser();
  model.enemies[0].animState = "walk";
  model.enemies[0].animTime = 0.7;
  model.startRun();
  assert.equal(model.player.animState, undefined);
  assert.equal(model.player.animTime, undefined);
  assert.equal(model.enemies.length, 0);
});
