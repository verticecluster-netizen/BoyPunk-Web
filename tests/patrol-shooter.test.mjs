import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE, DIFFICULTIES } from "../src/config.js";
import { GameModel, overlaps } from "../src/core.js";

const DT = 1 / 120;

function campaign(levelId = "district-neon", difficulty = "normal") {
  const model = new GameModel({ random: () => 0 });
  model.startRun({ levelId, difficulty });
  model.nextSpawnAt = Infinity;
  model.souls = [];
  model.enemies = [];
  model.projectiles = [];
  model.carriedSouls = 12;
  return model;
}

function route(model, id) {
  return model.level.patrolShooterSpawns.find((candidate) => candidate.id === id);
}

function stepPatrol(model, enemy, seconds) {
  const frames = Math.ceil(seconds / DT);
  for (let frame = 0; frame < frames; frame += 1) model.updatePatrolShooter(enemy, DT);
}

test("rotas declaradas têm apoio conectado e spawn rejeita geometria ou ocupação inválida", () => {
  for (const levelId of ["district-neon", "scrap-factory"]) {
    const model = campaign(levelId);
    for (const definition of model.level.patrolShooterSpawns) {
      assert.equal(model.isValidPatrolRoute(definition), true, definition.id);
    }
    assert.equal(model.isValidPatrolRoute({
      id: "gap",
      x: 100,
      y: 144,
      patrolLeft: 84,
      patrolRight: 128
    }), false, "uma rota suspensa sobre abertura não é válida");
  }

  const occupied = campaign();
  const definition = route(occupied, "district-ground-left");
  occupied.player.x = definition.x;
  occupied.player.y = definition.y;
  assert.equal(occupied.spawnPatrolShooter(definition), null, "não nasce sobre o jogador");
});

test("patrulha usa moveBody e reverte antes de bordas e paredes", () => {
  const edgeModel = campaign();
  edgeModel.player.x = 440;
  edgeModel.player.y = 208;
  const edgeEnemy = edgeModel.spawnPatrolShooter(route(edgeModel, "district-upper-left"));
  edgeEnemy.patrolDirection = 1;
  edgeEnemy.facing = 1;
  let edgeReversed = false;
  for (let frame = 0; frame < 720; frame += 1) {
    const before = edgeEnemy.patrolDirection;
    edgeModel.updatePatrolShooter(edgeEnemy, DT);
    edgeReversed ||= before !== edgeEnemy.patrolDirection;
    assert.ok(edgeEnemy.x >= edgeEnemy.patrolLeft - 0.001 && edgeEnemy.x <= edgeEnemy.patrolRight + 0.001);
    assert.equal(edgeModel.hasPatrolSupport(
      edgeEnemy.x + edgeEnemy.w / 2,
      edgeEnemy.y + edgeEnemy.h
    ), true, "o centro permanece apoiado na mesma superfície");
  }
  assert.equal(edgeReversed, true, "reverte antes da borda da plataforma unilateral");

  const wallModel = campaign("scrap-factory");
  wallModel.player.x = -500;
  wallModel.player.y = 208;
  const wallEnemy = wallModel.spawnPatrolShooter(route(wallModel, "factory-ground-right"));
  wallEnemy.patrolDirection = 1;
  wallEnemy.facing = 1;
  wallEnemy.patrolElapsed = 0;
  let wallReversed = false;
  for (let frame = 0; frame < 360; frame += 1) {
    const before = wallEnemy.patrolDirection;
    wallModel.updatePatrolShooter(wallEnemy, DT);
    wallReversed ||= before !== wallEnemy.patrolDirection;
    assert.ok(wallEnemy.x + wallEnemy.w <= 464 + 0.001, "não atravessa a parede direita");
  }
  assert.equal(wallReversed, true);
});

test("aviso trava a mira, interrompe locomoção e nunca causa dano", () => {
  const model = campaign();
  model.player.x = 140;
  model.player.y = 208;
  const enemy = model.spawnPatrolShooter(route(model, "district-ground-left"));
  enemy.patrolElapsed = BALANCE.encounter.patrolShooter.minimumPatrolSeconds;
  const lifeBefore = model.player.life;

  model.updatePatrolShooter(enemy, DT);
  assert.equal(enemy.phase, "aim");
  assert.equal(enemy.vx, 0);
  const locked = { x: enemy.aimX, y: enemy.aimY };
  model.player.x = 360;
  model.player.y = 208;
  stepPatrol(model, enemy, BALANCE.encounter.patrolShooter.aimSeconds - DT);
  assert.equal(enemy.phase, "aim");
  assert.deepEqual({ x: enemy.aimX, y: enemy.aimY }, locked);
  assert.equal(model.projectiles.length, 0);
  assert.equal(model.player.life, lifeBefore);
  assert.equal(model.events.filter((event) => event.type === "patrolShooterWarning").length, 1);

  stepPatrol(model, enemy, DT * 3);
  assert.equal(enemy.phase, "recovery");
  assert.equal(model.projectiles.length, 1);
  assert.equal(enemy.shots, 1);
  assert.ok(enemy.fireFeedbackTime > 0, "um tiro real mantém feedback visual além do tick lógico de fire");
  const shot = model.projectiles[0];
  const origin = model.patrolShooterMuzzle(enemy);
  assert.deepEqual(shot.spawnPosition, { x: origin.x - 4, y: origin.y - 4 });
  assert.ok(Math.sign(shot.vx) === Math.sign(locked.x - origin.x), "trajetória usa a mira travada");
  stepPatrol(model, enemy, 0.5);
  assert.equal(model.projectiles.length, 1, "um evento de fogo não duplica projéteis");
  assert.equal(enemy.fireFeedbackTime, 0);
});

test("geometria sólida bloqueia linha de tiro e continua bloqueando projéteis", () => {
  const model = campaign();
  model.player.x = 360;
  model.player.y = 208;
  const enemy = model.spawnPatrolShooter(route(model, "district-upper-left"));
  const origin = model.patrolShooterMuzzle(enemy);
  const blockedTarget = { x: model.player.x + model.player.w / 2, y: model.player.y + model.player.h / 2 };
  assert.equal(model.hasClearShot(origin, blockedTarget), false, "o platô central oclui a mira diagonal");
  assert.equal(model.canPatrolShooterAim(enemy), false);

  enemy.phase = "fire";
  enemy.phaseTime = 0;
  enemy.aimX = blockedTarget.x;
  enemy.aimY = blockedTarget.y;
  model.updatePatrolShooter(enemy, DT);
  assert.equal(enemy.phase, "recovery");
  assert.equal(model.projectiles.length, 0);

  model.projectiles.push({
    id: "enemy-wall-test",
    team: "enemy",
    x: 120,
    y: 180,
    spawnPosition: { x: 120, y: 180 },
    w: 8,
    h: 8,
    vx: 120,
    vy: 0,
    life: 2,
    age: 0,
    sourceId: enemy.id,
    removed: false
  });
  model.updateProjectiles(0.25);
  assert.equal(model.projectiles[0].removed, true, "o platô sólido x=144 bloqueia o projétil inimigo");
  assert.equal(model.events.some((event) => event.type === "projectileBlocked"), true);
});

test("cap negado entra em recuperação sem acumular disparo adiado", () => {
  const model = campaign();
  const enemy = model.spawnPatrolShooter(route(model, "district-ground-left"));
  const cap = model.getEncounterPhase().maxEnemyShots;
  model.projectiles = Array.from({ length: cap }, (_, index) => ({
    id: `cap-${index}`,
    team: "enemy",
    removed: false
  }));
  enemy.phase = "fire";
  enemy.phaseTime = 0;
  enemy.aimX = 140;
  enemy.aimY = 224;
  model.updatePatrolShooter(enemy, DT);
  assert.equal(enemy.phase, "recovery");
  assert.equal(enemy.shots, 0);
  assert.equal(enemy.fireFeedbackTime, 0, "cap negado não simula flash de disparo");
  assert.equal(model.projectiles.length, cap);
  assert.equal(model.events.filter((event) => event.type === "patrolShooterShotDenied").length, 1);

  model.projectiles = [];
  stepPatrol(model, enemy, BALANCE.encounter.patrolShooter.recoverySeconds + 0.2);
  assert.equal(model.projectiles.length, 0, "liberar o cap não produz rajada diferida");
  assert.equal(enemy.phase, "patrol");
});

test("pause, remoção e reinício impedem tiros de instâncias antigas", () => {
  const model = campaign();
  const enemy = model.spawnPatrolShooter(route(model, "district-ground-left"));
  enemy.phase = "aim";
  enemy.phaseTime = 0.2;
  enemy.aimX = 140;
  enemy.aimY = 224;
  enemy.fireFeedbackTime = 0.06;
  model.pause();
  model.update(0.05, {});
  assert.equal(enemy.phaseTime, 0.2, "pause congela o relógio do inimigo");
  assert.equal(enemy.fireFeedbackTime, 0.06, "pause também congela feedback visual");

  model.resume();
  enemy.removed = true;
  for (let frame = 0; frame < 120; frame += 1) model.update(DT, {});
  assert.equal(model.projectiles.length, 0, "inimigo removido não conclui o tiro");

  const previousRun = model.runId;
  model.startRun();
  assert.equal(model.runId, previousRun + 1);
  assert.equal(model.enemies.length, 0);
  assert.equal(model.projectiles.length, 0);
  assert.equal(model.patrolShooterPreview, false);
});

test("flags ativam somente campanha; dificuldade não multiplica tuning móvel", () => {
  assert.equal(BALANCE.encounter.patrolShooter.campaignEnabled, true);
  assert.equal(BALANCE.encounter.patrolShooter.survivalEnabled, false);
  assert.equal(BALANCE.encounter.patrolShooter.demoEnabled, false);
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const model = campaign("district-neon", difficulty);
    assert.equal(model.encounter.patrolShooter.patrolSpeed, 34);
    assert.equal(model.encounter.patrolShooter.aimSeconds, 0.9);
    assert.equal(model.encounter.patrolShooter.recoverySeconds, 1.25);
    const learning = model.encounter.phases.find((phase) => phase.id === "aprendizado");
    const confrontation = model.encounter.phases.find((phase) => phase.id === "confronto");
    model.rangedSpawnCount = 1;
    assert.equal(model.isPatrolShooterReplacementSlot(learning), false, "janela de aprendizado é excluída");
    assert.equal(model.isPatrolShooterReplacementSlot(confrontation), true, "segundo slot ranged tardio é elegível");
    model.rangedSpawnCount = 2;
    assert.equal(model.isPatrolShooterReplacementSlot(confrontation), false, "não expande todos os encontros ranged");
  }

  const survival = new GameModel({ random: () => 0 });
  survival.startSurvival();
  assert.equal(survival.enemies.some((enemy) => enemy.kind === "patrol-shooter"), false);
  const demo = new GameModel({ random: () => 0 });
  demo.startRun({ demo: true });
  assert.equal(demo.encounter.patrolShooter.demoEnabled, false);
  assert.equal(demo.enemies.some((enemy) => enemy.kind === "patrol-shooter"), false);
});

test("feedback de fogo sobrevive à amostragem de 60 Hz sem alterar tiro ou recovery", () => {
  const model = campaign();
  model.player.x = 140;
  const enemy = model.spawnPatrolShooter(route(model, "district-ground-left"));
  enemy.phase = "aim";
  enemy.phaseTime = DT;
  enemy.aimX = 151;
  enemy.aimY = 224;
  const bodyBefore = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
  const muzzleBefore = model.patrolShooterMuzzle(enemy);

  model.elapsed += DT;
  model.updatePatrolShooter(enemy, DT);
  model.elapsed += DT;
  model.updatePatrolShooter(enemy, DT);

  assert.equal(enemy.phase, "recovery", "dois ticks de 120 Hz podem cair entre quadros de 60 Hz");
  assert.equal(model.projectiles.length, 1);
  assert.equal(enemy.shots, 1);
  assert.ok(enemy.fireFeedbackTime >= BALANCE.encounter.patrolShooter.fireFeedbackSeconds - DT);
  assert.deepEqual({ x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h }, bodyBefore);
  assert.deepEqual(model.patrolShooterMuzzle(enemy), muzzleBefore, "recuo visual não move emissor físico");

  stepPatrol(model, enemy, BALANCE.encounter.patrolShooter.fireFeedbackSeconds + DT);
  assert.equal(enemy.fireFeedbackTime, 0);
  assert.equal(enemy.phase, "recovery");
  assert.equal(model.projectiles.length, 1, "o latch visual não chama a rotina de tiro");
});

test("diretor staged substitui 1/2 ranged tardios nos dois níveis sem evento ou custo extra", () => {
  const scenarios = [
    { levelId: "district-neon", progress: 8, phaseId: "confronto" },
    { levelId: "scrap-factory", progress: 8, phaseId: "compactacao" }
  ];
  for (const scenario of scenarios) {
    const model = campaign(scenario.levelId);
    model.carriedSouls = scenario.progress;
    const phase = model.getEncounterPhase();
    assert.equal(phase.id, scenario.phaseId);
    const kinds = [];
    for (let rangedOrdinal = 0; rangedOrdinal < 4; rangedOrdinal += 1) {
      model.enemies = [];
      model.events = [];
      model.spawnCount = phase.shooterEvery;
      model.rangedSpawnCount = rangedOrdinal;
      model.spawnClock = 10;
      model.nextSpawnAt = 0;
      model.updateSpawning(0);
      assert.equal(model.enemies.length, 1);
      assert.equal(model.events.filter((event) => event.type === "enemySpawned").length, 1);
      assert.equal(model.spawnCount, phase.shooterEvery + 1);
      assert.equal(model.rangedSpawnCount, rangedOrdinal + 1);
      const enemy = model.enemies[0];
      kinds.push(enemy.kind);
      if (enemy.kind === "patrol-shooter") {
        assert.equal(model.isValidPatrolRoute({
          id: enemy.routeId,
          x: enemy.x,
          y: enemy.y,
          patrolLeft: enemy.patrolLeft,
          patrolRight: enemy.patrolRight
        }), true);
      }
      const cost = ["shooter", "patrol-shooter"].includes(enemy.kind)
        ? BALANCE.encounter.patrolShooter.encounterCost : 1;
      assert.ok(cost <= phase.budget);
    }
    assert.deepEqual(kinds, ["shooter", "patrol-shooter", "shooter", "patrol-shooter"]);
  }
});

test("fases introdutórias, survival e demo nunca fazem substituição móvel", () => {
  for (const scenario of [
    { levelId: "district-neon", progress: 4, phaseId: "alerta" },
    { levelId: "scrap-factory", progress: 4, phaseId: "separacao" }
  ]) {
    const model = campaign(scenario.levelId);
    model.carriedSouls = scenario.progress;
    const phase = model.getEncounterPhase();
    assert.equal(phase.id, scenario.phaseId);
    model.rangedSpawnCount = 1;
    model.spawnCount = phase.shooterEvery;
    model.spawnClock = 10;
    model.nextSpawnAt = 0;
    model.updateSpawning(0);
    assert.deepEqual(model.enemies.map((enemy) => enemy.kind), ["shooter"]);
  }

  const demo = campaign("district-neon");
  demo.demoMode = true;
  demo.carriedSouls = 8;
  const demoPhase = demo.getEncounterPhase();
  demo.rangedSpawnCount = 1;
  demo.spawnCount = demoPhase.shooterEvery;
  demo.spawnClock = 10;
  demo.nextSpawnAt = 0;
  demo.updateSpawning(0);
  assert.deepEqual(demo.enemies.map((enemy) => enemy.kind), ["shooter"]);

  const survival = new GameModel({ random: () => 0 });
  survival.startSurvival();
  for (const enemy of survival.enemies) enemy.removed = true;
  survival.cleanupEntities();
  survival.survivalWave = BALANCE.survival.shooterStartsAtWave - 1;
  survival.startSurvivalWave();
  assert.equal(survival.enemies.some((enemy) => enemy.kind === "patrol-shooter"), false);
});

test("falha staged de rota faz fallback fixo uma vez e mantém contadores e limites", () => {
  const model = campaign("district-neon");
  model.carriedSouls = 8;
  const phase = model.getEncounterPhase();
  model.level = { ...model.level, patrolShooterSpawns: [] };
  model.rangedSpawnCount = 1;
  model.spawnCount = phase.shooterEvery;
  model.spawnClock = 10;
  model.nextSpawnAt = 0;
  model.events = [];

  model.updateSpawning(0);

  assert.deepEqual(model.enemies.map((enemy) => enemy.kind), ["shooter"]);
  assert.equal(model.events.filter((event) => event.type === "enemySpawned").length, 1);
  assert.equal(model.rangedSpawnCount, 2);
  assert.equal(model.spawnCount, phase.shooterEvery + 1);
  assert.ok(model.enemies.length <= phase.maxEnemies);
  assert.equal(model.enemies.some((enemy) => overlaps(enemy, model.player) || overlaps(enemy, model.altar)), false);
});

test("teto ranged compartilhado impede terceira unidade sem exceder budget", () => {
  const model = campaign("district-neon");
  model.carriedSouls = 8;
  const phase = model.getEncounterPhase();
  model.spawnShooter();
  const mobile = model.spawnPatrolShooter(route(model, "district-upper-right"));
  assert.ok(mobile);
  model.spawnCount = phase.shooterEvery;
  model.rangedSpawnCount = 1;
  model.spawnClock = 10;
  model.nextSpawnAt = 0;

  model.updateSpawning(0);

  const ranged = model.enemies.filter((enemy) => ["shooter", "patrol-shooter"].includes(enemy.kind));
  const cost = model.enemies.reduce((total, enemy) => total + (
    ["shooter", "patrol-shooter"].includes(enemy.kind) ? BALANCE.encounter.patrolShooter.encounterCost : 1
  ), 0);
  assert.equal(ranged.length, BALANCE.encounter.patrolShooter.maxActiveRanged);
  assert.ok(cost <= phase.budget);
  assert.ok(model.enemies.length <= phase.maxEnemies);
});

test("projétil móvel causa dano ao jogador ou ao altar que intercepta, nunca aos dois", () => {
  const playerRun = campaign("district-neon");
  playerRun.player.x = 140;
  const playerEnemy = playerRun.spawnPatrolShooter(route(playerRun, "district-ground-left"));
  playerEnemy.facing = 1;
  playerEnemy.aimX = playerRun.player.x + playerRun.player.w / 2;
  playerEnemy.aimY = playerRun.player.y + playerRun.player.h / 2;
  const playerLife = playerRun.player.life;
  const altarLife = playerRun.altar.life;
  assert.equal(playerRun.firePatrolShooterShot(playerEnemy), true);
  for (let frame = 0; frame < 180 && playerRun.projectiles.some((shot) => !shot.removed); frame += 1) {
    playerRun.updateProjectiles(DT);
  }
  assert.equal(playerRun.player.life, playerLife - 1);
  assert.equal(playerRun.altar.life, altarLife);

  const altarRun = campaign("district-neon");
  altarRun.player.x = 320;
  const altarEnemy = altarRun.spawnPatrolShooter(route(altarRun, "district-ground-left"));
  altarEnemy.facing = 1;
  altarEnemy.aimX = altarRun.player.x + altarRun.player.w / 2;
  altarEnemy.aimY = altarRun.player.y + altarRun.player.h / 2;
  const interceptedPlayerLife = altarRun.player.life;
  const interceptedAltarLife = altarRun.altar.life;
  assert.equal(altarRun.firePatrolShooterShot(altarEnemy), true);
  for (let frame = 0; frame < 300 && altarRun.projectiles.some((shot) => !shot.removed); frame += 1) {
    altarRun.updateProjectiles(DT);
  }
  assert.equal(altarRun.altar.life, interceptedAltarLife - 1);
  assert.equal(altarRun.player.life, interceptedPlayerLife);
});

test("âncora visual e emissor físico coincidem nos dois facings", () => {
  const model = campaign();
  const enemy = model.spawnPatrolShooter(route(model, "district-ground-left"));
  const drawX = enemy.x + enemy.w / 2 - 16;
  enemy.facing = -1;
  assert.deepEqual(model.patrolShooterMuzzle(enemy), { x: drawX + 6, y: enemy.y + 13 });
  enemy.facing = 1;
  assert.deepEqual(model.patrolShooterMuzzle(enemy), { x: drawX + 26, y: enemy.y + 13 });
});

test("preview isolado ativa debug gameplay sem elegibilidade de progresso", () => {
  const model = new GameModel({ random: () => 0 });
  assert.equal(model.startPatrolShooterPreview(), true);
  assert.equal(model.patrolShooterPreview, true);
  assert.equal(model.progressionEligible, false);
  assert.equal(model.bonusQualificationEligible, false);
  assert.equal(model.nextSpawnAt, Infinity);
  assert.deepEqual(model.enemies.map((enemy) => enemy.kind), ["patrol-shooter"]);
});
