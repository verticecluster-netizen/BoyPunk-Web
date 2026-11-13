import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE } from "../src/config.js";
import { GameModel } from "../src/core.js";
import { getLevelDefinition } from "../src/level-data.js";

function setupBonusModel() {
  const model = new GameModel();
  model.startBonusPreview();
  return model;
}

const levelDef = getLevelDefinition(BALANCE.levels.bonusId);
const platforms = levelDef.platforms;

// Identify one-way platform tiers by y coordinate
const oneWayPlatforms = platforms.filter((p) => p.oneWay);
const tiers = [80, 120, 160, 200];

test("todos os vãos da Câmara de Energia possuem largura mínima de 44px (folga >= 22px)", () => {
  for (const tierY of tiers) {
    const tierPlatforms = oneWayPlatforms
      .filter((p) => p.y === tierY)
      .sort((a, b) => a.x - b.x);

    assert.ok(tierPlatforms.length >= 2, `Tier y=${tierY} deve ter pelo menos 2 plataformas`);

    for (let i = 0; i < tierPlatforms.length - 1; i += 1) {
      const current = tierPlatforms[i];
      const next = tierPlatforms[i + 1];
      const gapWidth = next.x - (current.x + current.w);
      assert.ok(
        gapWidth >= 44,
        `Vão no tier y=${tierY} entre x=${current.x + current.w} e x=${next.x} tem apenas ${gapWidth}px (esperado >= 44px)`
      );
      assert.equal(
        current.w % 16,
        0,
        `Plataforma em x=${current.x}, y=${current.y} com w=${current.w} deve ser múltiplo de 16px para alinhamento de tiles`
      );
    }
  }
});

test("todos os vãos da arena possuem largura mínima de 44px (folga >= 22px) e alinhamento de 16px", () => {
  for (const tierY of tiers) {
    const tierPlatforms = oneWayPlatforms
      .filter((p) => p.y === tierY)
      .sort((a, b) => a.x - b.x);

    assert.ok(tierPlatforms.length >= 2, `Tier y=${tierY} deve ter pelo menos 2 plataformas`);

    for (let i = 0; i < tierPlatforms.length - 1; i += 1) {
      const current = tierPlatforms[i];
      const next = tierPlatforms[i + 1];
      const gapWidth = next.x - (current.x + current.w);
      assert.ok(
        gapWidth >= 44,
        `Vão no tier y=${tierY} entre x=${current.x + current.w} e x=${next.x} tem apenas ${gapWidth}px (esperado >= 44px)`
      );
      assert.equal(
        current.w % 16,
        0,
        `Plataforma em x=${current.x}, y=${current.y} com w=${current.w} deve ser múltiplo de 16px para alinhamento de tiles`
      );
    }
  }
});

test("nenhum vão entre patamares adjacentes se sobrepõe, garantindo pouso seguro sem queda de múltiplos níveis", () => {
  const allTiers = [];
  for (const tierY of tiers) {
    const tierPlatforms = oneWayPlatforms.filter((p) => p.y === tierY).sort((a, b) => a.x - b.x);
    const gaps = [];
    for (let i = 0; i < tierPlatforms.length - 1; i += 1) {
      gaps.push([tierPlatforms[i].x + tierPlatforms[i].w, tierPlatforms[i + 1].x]);
    }
    allTiers.push({ y: tierY, gaps });
  }
  allTiers.push({ y: 240, gaps: [[216, 264]] }); // Fosso do piso

  for (let i = 0; i < allTiers.length - 1; i += 1) {
    const upper = allTiers[i];
    const lower = allTiers[i + 1];

    for (const [ugLeft, ugRight] of upper.gaps) {
      for (const [lgLeft, lgRight] of lower.gaps) {
        const overlap = Math.max(0, Math.min(ugRight, lgRight) - Math.max(ugLeft, lgLeft));
        assert.equal(
          overlap,
          0,
          `Sobreposição de ${overlap}px detectada entre vão superior y=${upper.y} [${ugLeft}..${ugRight}] e vão inferior y=${lower.y} [${lgLeft}..${lgRight}]`
        );
      }
    }
  }
});

test("queda vertical no centro de todos os vãos desce e pousa com estabilidade no nível imediatamente abaixo", () => {
  const tierTransitions = [
    { fromTier: 80, toTier: 120 },
    { fromTier: 120, toTier: 160 },
    { fromTier: 160, toTier: 200 },
    { fromTier: 200, toTier: 240 }
  ];

  for (const { fromTier, toTier } of tierTransitions) {
    const tierPlatforms = oneWayPlatforms
      .filter((p) => p.y === fromTier)
      .sort((a, b) => a.x - b.x);

    for (let i = 0; i < tierPlatforms.length - 1; i += 1) {
      const current = tierPlatforms[i];
      const next = tierPlatforms[i + 1];
      const gapLeft = current.x + current.w;
      const gapRight = next.x;
      const gapWidth = gapRight - gapLeft;

      const model = setupBonusModel();
      const playerW = model.player.w; // 22
      const spawnX = gapLeft + (gapWidth - playerW) / 2;
      const expectedLandingY = toTier - model.player.h;

      // Spawn player inside the gap at the fromTier level
      model.player.x = spawnX;
      model.player.y = fromTier - 16;
      model.player.vx = 0;
      model.player.vy = 0;
      model.player.onGround = false;

      // Simulate fall through gap until landed
      for (let frame = 0; frame < 90; frame += 1) {
        model.update(1 / 120, {});
        if (model.player.onGround) break;
      }

      assert.equal(
        model.player.onGround,
        true,
        `Jogador caindo pelo vão y=${fromTier} [${gapLeft}..${gapRight}] não aterrissou com estabilidade (y=${model.player.y})`
      );
      assert.equal(
        model.player.y,
        expectedLandingY,
        `Jogador caindo de y=${fromTier} deveria aterrissar em y=${expectedLandingY}, mas parou em y=${model.player.y}`
      );
    }
  }
});

test("caminhada para a direita caindo pela borda desce e pousa com estabilidade no nível inferior", () => {
  const tierTransitions = [
    { fromTier: 80, toTier: 120 },
    { fromTier: 120, toTier: 160 },
    { fromTier: 160, toTier: 200 },
    { fromTier: 200, toTier: 240 }
  ];

  for (const { fromTier, toTier } of tierTransitions) {
    const tierPlatforms = oneWayPlatforms
      .filter((p) => p.y === fromTier)
      .sort((a, b) => a.x - b.x);

    for (let i = 0; i < tierPlatforms.length - 1; i += 1) {
      const current = tierPlatforms[i];
      const gapLeft = current.x + current.w;
      const standingYOnTier = fromTier - 32;
      const expectedLandingY = toTier - 32;

      const model = setupBonusModel();
      model.player.x = gapLeft - 10;
      model.player.y = standingYOnTier;
      model.player.vx = 0;
      model.player.vy = 0;
      model.player.onGround = true;

      // Walk right off the edge into gap, releasing key upon leaving
      for (let frame = 0; frame < 120; frame += 1) {
        const input = model.player.x < gapLeft + 12 ? { right: true } : {};
        model.update(1 / 120, input);
        if (model.player.onGround && model.player.y >= expectedLandingY - 2) break;
      }

      assert.equal(
        model.player.onGround,
        true,
        `Jogador caminhando à direita não aterrissou no piso inferior a partir de x=${gapLeft}, y=${model.player.y}`
      );
      assert.equal(
        model.player.y,
        expectedLandingY,
        `Jogador caminhando à direita de y=${fromTier} deveria aterrissar em y=${expectedLandingY}, mas parou em y=${model.player.y}`
      );
    }
  }
});

test("caminhada para a esquerda caindo pela borda desce e pousa com estabilidade no nível inferior", () => {
  const tierTransitions = [
    { fromTier: 80, toTier: 120 },
    { fromTier: 120, toTier: 160 },
    { fromTier: 160, toTier: 200 },
    { fromTier: 200, toTier: 240 }
  ];

  for (const { fromTier, toTier } of tierTransitions) {
    const tierPlatforms = oneWayPlatforms
      .filter((p) => p.y === fromTier)
      .sort((a, b) => a.x - b.x);

    for (let i = 0; i < tierPlatforms.length - 1; i += 1) {
      const next = tierPlatforms[i + 1];
      const gapRight = next.x;
      const standingYOnTier = fromTier - 32;
      const expectedLandingY = toTier - 32;

      const model = setupBonusModel();
      model.player.x = gapRight + 6;
      model.player.y = standingYOnTier;
      model.player.vx = 0;
      model.player.vy = 0;
      model.player.onGround = true;

      // Walk left off the edge into gap (player right edge must clear gapRight)
      for (let frame = 0; frame < 120; frame += 1) {
        const input = model.player.x + model.player.w > gapRight - 12 ? { left: true } : {};
        model.update(1 / 120, input);
        if (model.player.onGround && model.player.y >= expectedLandingY - 2) break;
      }

      assert.equal(
        model.player.onGround,
        true,
        `Jogador caminhando à esquerda não aterrissou no piso inferior a partir de x=${gapRight}, y=${model.player.y}`
      );
      assert.equal(
        model.player.y,
        expectedLandingY,
        `Jogador caminhando à esquerda de y=${fromTier} deveria aterrissar em y=${expectedLandingY}, mas parou em y=${model.player.y}`
      );
    }
  }
});

test("fosso do piso inferior em y=240 recupera o jogador na posição segura", () => {
  const model = setupBonusModel();
  const safe = model.level.safePosition;

  // Drop player into bottom floor pit (between x=216 and x=264)
  model.player.x = 230;
  model.player.y = 230;
  model.player.vx = 0;
  model.player.vy = 100;

  for (let frame = 0; frame < 90; frame += 1) {
    model.update(1 / 120, {});
    if (model.player.x === safe.x && model.player.y === safe.y) break;
  }

  // Model updates should have triggered fall recovery
  assert.equal(model.player.x, safe.x);
  assert.equal(model.player.y, safe.y);
  assert.equal(model.player.onGround, true);
  assert.equal(model.player.jumpsUsed, 0);
});

test("paredes laterais sólidas em x=0 e x=464 bloqueiam deslocamento horizontal", () => {
  const model = setupBonusModel();

  // Try moving left against left wall (x=0..16)
  model.player.x = 17;
  model.player.y = 208;
  for (let frame = 0; frame < 30; frame += 1) {
    model.update(1 / 120, { left: true });
  }
  assert.ok(model.player.x >= 16, `Parede esquerda violada: player.x=${model.player.x}`);

  // Try moving right against right wall (x=464..480)
  model.player.x = 440;
  model.player.y = 208;
  for (let frame = 0; frame < 30; frame += 1) {
    model.update(1 / 120, { right: true });
  }
  assert.ok(
    model.player.x + model.player.w <= 464 + 0.01,
    `Parede direita violada: player.right=${model.player.x + model.player.w}`
  );
});

test("jogador alcança o patamar superior desde o spawn e desce pelo vão central com entradas reais", () => {
  const model = setupBonusModel();
  model.bonusCannon = null;
  const route = [
    [48, 216], [176, 216], [304, 216], [432, 216],
    [432, 176], [304, 176], [184, 176], [48, 176],
    [32, 136], [88, 136], [172, 136], [228, 136], [284, 136], [340, 136], [420, 136],
    [432, 96], [372, 96], [300, 96], [244, 96], [188, 96], [116, 96], [48, 96],
    [28, 56]
  ];
  let routeIndex = 0;
  let lastJumpFrame = -99;
  let stabilize = false;
  let reachedTopAt = null;
  let landedBelowAt = null;

  for (let frame = 0; frame < 2400 && model.state === "bonusPlaying"; frame += 1) {
    while (routeIndex < route.length && !model.souls.some((soul) => (
      soul.x === route[routeIndex][0] && soul.y === route[routeIndex][1]
    ))) routeIndex += 1;
    const input = {};
    if (routeIndex < route.length) {
      const [targetX, targetY] = route[routeIndex];
      const playerCenter = model.player.x + model.player.w / 2;
      const targetCenter = targetX + 7.5;
      if (stabilize) {
        if (model.player.onGround) stabilize = false;
      } else {
        if (playerCenter < targetCenter - 4) input.right = true;
        else if (playerCenter > targetCenter + 4) input.left = true;
        if (targetY < model.player.y - 6
          && (model.player.onGround || (model.player.jumpsUsed < 2 && model.player.vy > -40 && frame - lastJumpFrame > 15))) {
          input.jumpPressed = true;
          lastJumpFrame = frame;
        }
      }
      const before = model.bonusCollected;
      model.update(1 / 120, input);
      if (model.bonusCollected > before && !model.player.onGround) stabilize = true;
      continue;
    }

    if (reachedTopAt === null) {
      if (!model.player.onGround || Math.abs(model.player.y - 48) > 0.01) {
        model.update(1 / 120, {});
        continue;
      }
      reachedTopAt = model.elapsed;
    }
    const centerX = model.player.x + model.player.w / 2;
    if (model.player.y < 52 && centerX < 226) input.right = true;
    model.update(1 / 120, input);
    if (model.player.onGround && Math.abs(model.player.y - 88) < 0.01) {
      landedBelowAt = model.elapsed;
      break;
    }
  }

  assert.ok(reachedTopAt !== null, "a subida completa deve alcançar o patamar y=80 sem reposicionar o jogador");
  assert.ok(landedBelowAt !== null, "o vão central y=80 deve permitir descida e pouso estável em y=120");
  assert.ok(landedBelowAt <= 20, `subida e descida levaram ${landedBelowAt?.toFixed(3)}s`);
  assert.equal(model.player.y, 88);
  assert.equal(model.player.onGround, true);
});
