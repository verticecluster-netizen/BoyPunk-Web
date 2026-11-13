// Distrito Neon foi extraído do layout Gameplay.json do projeto-fonte.
// Fábrica de Sucata é um protótipo de gameplay que reutiliza o runtime comum.
import { BALANCE } from "./config.js";

export const WORLD = Object.freeze({ width: 480, height: 270 });

const freezeRects = (items) => Object.freeze(items.map((item) => Object.freeze({ ...item })));
const sharedObjective = Object.freeze({
  soulsGoal: BALANCE.objective.soulsGoal,
  altarMaxLife: BALANCE.objective.altarMaxLife,
  altarInvulnerability: BALANCE.objective.altarInvulnerability,
  depositRadius: BALANCE.objective.depositRadius
});

const districtPlatforms = freezeRects([
  { x: -16, y: 112, w: 192, h: 16, oneWay: true },
  { x: 288, y: 112, w: 208, h: 16, oneWay: true },
  { x: -16, y: 176, w: 96, h: 16, oneWay: true },
  { x: 144, y: 176, w: 160, h: 16, oneWay: false },
  { x: -16, y: 240, w: 512, h: 32, oneWay: false },
  { x: 464, y: 112, w: 16, h: 32, oneWay: false },
  { x: 0, y: 16, w: 16, h: 48, oneWay: false },
  { x: 0, y: 112, w: 16, h: 32, oneWay: false },
  { x: 0, y: 176, w: 16, h: 32, oneWay: false },
  { x: 464, y: 176, w: 16, h: 32, oneWay: false },
  { x: 464, y: 16, w: 16, h: 48, oneWay: false },
  { x: -16, y: 0, w: 512, h: 16, oneWay: true },
  { x: 368, y: 176, w: 128, h: 16, oneWay: true }
]);

const district = Object.freeze({
  id: BALANCE.levels.currentId,
  title: "Distrito Neon",
  theme: "neon-district",
  world: WORLD,
  objective: sharedObjective,
  platforms: districtPlatforms,
  playerStart: Object.freeze({ x: 18, y: 208 }),
  altar: Object.freeze({ x: 208, y: 192, w: 32, h: 48 }),
  chaserSpawns: freezeRects([
    { x: 64, y: 208 }, { x: 400, y: 208 }, { x: 32, y: 80 }, { x: 416, y: 80 }
  ]),
  shooterSpawns: freezeRects([
    { x: 24, y: 80 }, { x: 424, y: 80 }, { x: 24, y: 144 }, { x: 424, y: 144 }
  ]),
  patrolShooterSpawns: freezeRects([
    { id: "district-ground-left", x: 64, y: 208, patrolLeft: 24, patrolRight: 184 },
    { id: "district-upper-left", x: 40, y: 80, patrolLeft: 16, patrolRight: 160 },
    { id: "district-upper-right", x: 400, y: 80, patrolLeft: 304, patrolRight: 448 }
  ]),
  powerUpSpawns: freezeRects([
    { id: "district-double-burst", typeId: "double-burst", x: 180, y: 160, w: 16, h: 16 }
  ]),
  placedSouls: freezeRects([
    { x: 72, y: 88 }, { x: 396, y: 88 }, { x: 232, y: 148 }
  ]),
  encounter: Object.freeze({}),
  presses: Object.freeze([])
});

const scrapFactoryPlatforms = freezeRects([
  { x: -16, y: 240, w: 512, h: 32, oneWay: false },
  { x: -16, y: 0, w: 512, h: 16, oneWay: true },
  { x: 0, y: 16, w: 16, h: 224, oneWay: false },
  { x: 464, y: 16, w: 16, h: 224, oneWay: false },
  { x: 16, y: 176, w: 112, h: 16, oneWay: true },
  { x: 352, y: 176, w: 112, h: 16, oneWay: true },
  { x: 112, y: 112, w: 98, h: 16, oneWay: true },
  { x: 270, y: 112, w: 98, h: 16, oneWay: true },
  { x: 32, y: 64, w: 96, h: 16, oneWay: true },
  { x: 352, y: 64, w: 112, h: 16, oneWay: true }
]);

const factoryEncounter = Object.freeze({
  openingDelay: 5.5,
  maxEnemies: 4,
  maxProjectiles: 10,
  phases: Object.freeze([
    Object.freeze({ id: "observacao", from: 0, budget: 2, maxEnemies: 2, maxEnemyShots: 0, spawnInterval: 3.45, shooterEvery: 0 }),
    Object.freeze({ id: "separacao", from: 4, budget: 4, maxEnemies: 3, maxEnemyShots: 1, spawnInterval: 3, shooterEvery: 4 }),
    Object.freeze({ id: "compactacao", from: 8, budget: 5, maxEnemies: 4, maxEnemyShots: 2, spawnInterval: 2.65, shooterEvery: 3 }),
    Object.freeze({ id: "expedicao", from: 12, budget: 5, maxEnemies: 4, maxEnemyShots: 3, spawnInterval: 2.45, shooterEvery: 2 })
  ])
});

const press = Object.freeze({
  id: "scrap-press-01",
  x: 218,
  w: 44,
  headHeight: 16,
  idleY: 128,
  closedY: 208,
  damage: 1,
  damagesEnemies: false,
  initialIdle: 4,
  phases: Object.freeze({ idle: 2.8, warning: 1.25, closing: 0.65, recovery: 1.35 })
});

const scrapFactory = Object.freeze({
  id: BALANCE.levels.nextId,
  title: "Fábrica de Sucata",
  theme: "scrap-factory",
  world: WORLD,
  objective: sharedObjective,
  platforms: scrapFactoryPlatforms,
  playerStart: Object.freeze({ x: 92, y: 208 }),
  altar: Object.freeze({ x: 40, y: 192, w: 32, h: 48 }),
  chaserSpawns: freezeRects([
    { x: 384, y: 208 }, { x: 32, y: 208 }, { x: 150, y: 80 }, { x: 310, y: 80 }
  ]),
  shooterSpawns: freezeRects([
    { x: 400, y: 144 }, { x: 32, y: 144 }, { x: 304, y: 88 }
  ]),
  patrolShooterSpawns: freezeRects([
    { id: "factory-ground-right", x: 384, y: 208, patrolLeft: 280, patrolRight: 448 },
    { id: "factory-mid-left", x: 150, y: 80, patrolLeft: 112, patrolRight: 194 },
    { id: "factory-mid-right", x: 304, y: 80, patrolLeft: 270, patrolRight: 352 }
  ]),
  powerUpSpawns: freezeRects([
    { id: "factory-double-burst", typeId: "double-burst", x: 372, y: 160, w: 16, h: 16 }
  ]),
  placedSouls: freezeRects([
    { x: 82, y: 148 }, { x: 154, y: 84 }, { x: 310, y: 84 },
    { x: 404, y: 148 }, { x: 302, y: 216 }
  ]),
  encounter: factoryEncounter,
  presses: Object.freeze([press])
});

const bonusPlatforms = freezeRects([
  { x: -16, y: 240, w: 232, h: 32, oneWay: false },
  { x: 264, y: 240, w: 232, h: 32, oneWay: false },
  { x: 0, y: 16, w: 16, h: 224, oneWay: false },
  { x: 464, y: 16, w: 16, h: 224, oneWay: false },

  // Tier 1 (y = 200, Pattern A: Gaps [64..112] and [368..416], Center [112..368] covers Floor Pit)
  { x: 16, y: 200, w: 48, h: 16, oneWay: true },
  { x: 112, y: 200, w: 256, h: 16, oneWay: true },
  { x: 416, y: 200, w: 48, h: 16, oneWay: true },

  // Tier 2 (y = 160, Pattern B: Center Gap [208..272], 96px offset from Tier 1 gaps)
  { x: 16, y: 160, w: 192, h: 16, oneWay: true },
  { x: 272, y: 160, w: 192, h: 16, oneWay: true },

  // Tier 3 (y = 120, Pattern A: Gaps [64..112] and [368..416], 96px offset from Tier 2 gap)
  { x: 16, y: 120, w: 48, h: 16, oneWay: true },
  { x: 112, y: 120, w: 256, h: 16, oneWay: true },
  { x: 416, y: 120, w: 48, h: 16, oneWay: true },

  // Tier 4 (y = 80, Pattern B: Center Gap [208..272], 96px offset from Tier 3 gaps)
  { x: 16, y: 80, w: 192, h: 16, oneWay: true },
  { x: 272, y: 80, w: 192, h: 16, oneWay: true }
]);

const bonusSoulPositions = freezeRects([
  { x: 48, y: 216, difficulty: "accessible" },
  { x: 176, y: 216, difficulty: "accessible" },
  { x: 304, y: 216, difficulty: "accessible" },
  { x: 432, y: 216, difficulty: "accessible" },
  { x: 48, y: 176, difficulty: "accessible" },
  { x: 184, y: 176, difficulty: "accessible" },
  { x: 304, y: 176, difficulty: "accessible" },
  { x: 432, y: 176, difficulty: "accessible" },
  { x: 32, y: 136, difficulty: "intermediate" },
  { x: 88, y: 136, difficulty: "intermediate" },
  { x: 172, y: 136, difficulty: "intermediate" },
  { x: 228, y: 136, difficulty: "intermediate" },
  { x: 284, y: 136, difficulty: "intermediate" },
  { x: 340, y: 136, difficulty: "intermediate" },
  { x: 420, y: 136, difficulty: "intermediate" },
  { x: 48, y: 96, difficulty: "intermediate" },
  { x: 116, y: 96, difficulty: "intermediate" },
  { x: 188, y: 96, difficulty: "intermediate" },
  { x: 244, y: 96, difficulty: "intermediate" },
  { x: 300, y: 96, difficulty: "intermediate" },
  { x: 372, y: 96, difficulty: "intermediate" },
  { x: 432, y: 96, difficulty: "intermediate" },
  { x: 28, y: 56, difficulty: "advanced" },
  { x: 76, y: 56, difficulty: "advanced" },
  { x: 156, y: 56, difficulty: "advanced" },
  { x: 212, y: 56, difficulty: "advanced" },
  { x: 268, y: 56, difficulty: "advanced" },
  { x: 324, y: 56, difficulty: "advanced" },
  { x: 388, y: 56, difficulty: "advanced" },
  { x: 444, y: 56, difficulty: "advanced" }
]);

const energyChamber = Object.freeze({
  id: BALANCE.levels.bonusId,
  title: "Câmara de Energia",
  theme: "energy-chamber",
  world: WORLD,
  objective: sharedObjective,
  platforms: bonusPlatforms,
  playerStart: Object.freeze({ x: 18, y: 208 }),
  safePosition: Object.freeze({ x: 18, y: 208 }),
  altar: null,
  chaserSpawns: Object.freeze([]),
  shooterSpawns: Object.freeze([]),
  patrolShooterSpawns: Object.freeze([]),
  powerUpSpawns: Object.freeze([]),
  placedSouls: bonusSoulPositions,
  encounter: Object.freeze({}),
  presses: Object.freeze([])
});

export const LEVELS = Object.freeze({
  [district.id]: district,
  [scrapFactory.id]: scrapFactory,
  [energyChamber.id]: energyChamber
});

export function getLevelDefinition(levelId = BALANCE.levels.currentId) {
  return LEVELS[levelId] ?? district;
}

// Aliases legados mantêm ferramentas e testes antigos apontados ao Distrito Neon.
export const LEVEL = district;
export const PLATFORMS = districtPlatforms;
