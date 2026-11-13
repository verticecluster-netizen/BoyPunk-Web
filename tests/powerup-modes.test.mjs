import assert from "node:assert/strict";
import test from "node:test";
import { GameModel } from "../src/core.js";
import { CoopGameModel } from "../src/coop.js";

function types(model) {
  return model.powerUps.map((item) => item.powerUpType).sort();
}

test("matriz real de criação dos pickups por modo", () => {
  const campaign = new GameModel({ random: () => 0 });
  campaign.startRun();
  assert.deepEqual(types(campaign), ["health", "rapid-fire", "shield"]);
  assert.equal(campaign.powerUpPickup, null, "Rajada Dupla da campanha continua condicionada à progressão");

  const bonus = new GameModel({ random: () => 0 });
  bonus.startBonusPreview(undefined, "boypunk");
  assert.deepEqual(types(bonus), [], "bônus preserva entrada escalonada");
  bonus.updateSupportPickupRespawns(2.21);
  assert.deepEqual(types(bonus), ["rapid-fire"]);

  const survival = new GameModel({ random: () => 0 });
  survival.startSurvival({ characterId: "boypunk" });
  assert.deepEqual(types(survival), ["double-burst", "health", "rapid-fire", "shield"]);

  const coopSurvival = new CoopGameModel({ random: () => 0 });
  coopSurvival.startCoopSurvival();
  assert.deepEqual(types(coopSurvival), ["double-burst", "health", "rapid-fire", "shield"]);

  const coopPreview = new CoopGameModel({ random: () => 0 });
  coopPreview.startCoopPreview();
  assert.deepEqual(types(coopPreview), []);
  assert.equal(coopPreview.powerUpsAllowed(), false);

  const demo = new GameModel({ random: () => 0 });
  demo.startRun({ demo: true });
  assert.deepEqual(types(demo), []);
  assert.equal(demo.powerUpsAllowed(), false);
});
