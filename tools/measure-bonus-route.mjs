#!/usr/bin/env node
import { BONUS_RULES } from "../src/bonus.js";
import { GameModel } from "../src/core.js";

const route = [
  [48, 216], [176, 216], [304, 216], [432, 216],
  [432, 176], [304, 176], [184, 176], [48, 176],
  [32, 136], [88, 136], [172, 136], [228, 136], [284, 136], [340, 136], [420, 136],
  [432, 96], [372, 96], [300, 96], [244, 96], [188, 96], [116, 96], [48, 96],
  [28, 56], [76, 56], [156, 56], [212, 56], [268, 56], [324, 56], [388, 56], [444, 56]
];

const model = new GameModel();
model.startBonusPreview();
const eventCounts = {};
const inputFrames = { left: 0, right: 0, neutral: 0, jump: 0 };
let routeIndex = 0;
let lastJumpFrame = -99;
let stabilizingLanding = false;

for (let frame = 0; frame < BONUS_RULES.durationSeconds * 120 && model.state === "bonusPlaying"; frame += 1) {
  while (routeIndex < route.length && !model.souls.some((soul) => (
    soul.x === route[routeIndex][0] && soul.y === route[routeIndex][1]
  ))) routeIndex += 1;
  if (routeIndex >= route.length) break;
  const [targetX, targetY] = route[routeIndex];
  const playerCenter = model.player.x + model.player.w / 2;
  const targetCenter = targetX + 7.5;
  const input = {};
  if (stabilizingLanding) {
    if (model.player.onGround) stabilizingLanding = false;
  } else {
    if (playerCenter < targetCenter - 4) input.right = true;
    else if (playerCenter > targetCenter + 4) input.left = true;
    if (targetY < model.player.y - 6
      && (model.player.onGround || (model.player.jumpsUsed < 2 && model.player.vy > -40 && frame - lastJumpFrame > 15))) {
      input.jumpPressed = true;
      lastJumpFrame = frame;
    }
  }
  if (input.left) inputFrames.left += 1;
  else if (input.right) inputFrames.right += 1;
  else inputFrames.neutral += 1;
  if (input.jumpPressed) inputFrames.jump += 1;
  const collectedBefore = model.bonusCollected;
  model.update(1 / 120, input);
  if (model.bonusCollected > collectedBefore && !model.player.onGround) stabilizingLanding = true;
  for (const event of model.consumeEvents()) eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
}

const result = {
  fixedStepHz: 120,
  state: model.state,
  collected: model.bonusResult?.collected ?? model.bonusCollected,
  score: model.bonusResult?.score ?? null,
  simulationSeconds: Number(model.elapsed.toFixed(3)),
  clockConsumedSeconds: model.bonusResult ? Number(model.bonusResult.activeSeconds.toFixed(3)) : Number((BONUS_RULES.durationSeconds - model.bonusRemaining).toFixed(3)),
  remainingSeconds: Number(model.bonusRemaining.toFixed(3)),
  inputFrames,
  cannon: {
    warnings: eventCounts.bonusCannonWarning ?? 0,
    shots: eventCounts.bonusCannonFired ?? 0,
    hits: eventCounts.bonusCannonHit ?? 0,
    protectedHits: eventCounts.bonusCannonHitIgnored ?? 0,
    blocked: eventCounts.projectileBlocked ?? 0
  }
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.state !== "bonusComplete" || result.collected !== 30 || result.score !== 350) process.exitCode = 1;
