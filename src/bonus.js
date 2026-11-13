export const BONUS_RULES = Object.freeze({
  durationSeconds: 20,
  totalSouls: 30,
  pointsPerSoul: 10,
  completionBonus: 50,
  maximumScore: 350,
  qualificationThreshold: 75,
  victoryPoints: 50,
  healthyRatio: 0.75,
  healthyPoints: 25,
  transitionSeconds: 1.35,
  reducedMotionTransitionSeconds: 0.35
});

export const BONUS_CANNON_RULES = Object.freeze({
  id: "energy-cannon-01",
  body: Object.freeze({ x: 452, y: 208, w: 12, h: 24 }),
  muzzle: Object.freeze({ x: 448, y: 220 }),
  initialSafeSeconds: 2.8,
  telegraphSeconds: 0.8,
  recoverySeconds: 2.4,
  hitProtectionSeconds: 0.8,
  timePenaltySeconds: 1,
  projectile: Object.freeze({ w: 8, h: 8, speed: 132, lifetimeSeconds: 3.6 }),
  maximumActiveProjectiles: 1
});

const freezeBonusEntries = (entries) => Object.freeze(entries.map((entry) => Object.freeze({
  ...entry,
  candidates: entry.candidates
    ? Object.freeze(entry.candidates.map((candidate) => Object.freeze({ ...candidate })))
    : undefined
})));

// Ajustes exclusivos da Câmara de Energia. Permanecem centralizados para que o
// playtest possa calibrar pressão sem alterar os contratos globais dos inimigos.
export const BONUS_COMBAT_RULES = Object.freeze({
  maximumMobileEnemies: 2,
  minimumPlayerDistance: 104,
  objectiveClearance: 10,
  spawnRetrySeconds: 0.35,
  lowLifeThreshold: 1,
  enemySpawns: freezeBonusEntries([
    {
      id: "bonus-chaser-first",
      kind: "chaser",
      startsAtElapsed: 3.4,
      minimumRemaining: 12,
      telegraphSeconds: 0.75,
      candidates: [
        { id: "ground-right", x: 336, y: 208 },
        { id: "tier-1-left", x: 144, y: 168 },
        { id: "tier-2-right", x: 368, y: 128 }
      ]
    },
    {
      id: "bonus-chaser-second",
      kind: "chaser",
      startsAtElapsed: 10,
      minimumRemaining: 6.5,
      telegraphSeconds: 0.8,
      deferAtLowLife: true,
      candidates: [
        { id: "tier-2-left", x: 120, y: 128 },
        { id: "tier-3-center", x: 272, y: 88 },
        { id: "tier-4-left", x: 104, y: 48 },
        { id: "tier-4-right", x: 352, y: 48 }
      ]
    }
  ]),
  pickups: freezeBonusEntries([
    { spawnId: "bonus-rapid-fire", powerUpType: "rapid-fire", x: 132, y: 180, w: 20, h: 20, groundY: 200, initialDelay: 2.2, respawnSeconds: 6 },
    { spawnId: "bonus-health", powerUpType: "health", x: 112, y: 140, w: 20, h: 20, groundY: 160, initialDelay: 5.8, respawnSeconds: 5 },
    { spawnId: "bonus-shield", powerUpType: "shield", x: 320, y: 100, w: 20, h: 20, groundY: 120, initialDelay: 8, respawnSeconds: 5.5 },
    { spawnId: "bonus-double-burst", powerUpType: "double-burst", x: 344, y: 64, w: 16, h: 16, groundY: 80, initialDelay: 10.5, respawnSeconds: 5 }
  ])
});

function safeRatio(value, maximum) {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || maximum <= 0) return 0;
  return Math.max(0, Math.min(1, value / maximum));
}

export function calculateBonusQualification(stats, { eligible = true } = {}) {
  const playerRatio = safeRatio(stats?.playerLife, stats?.playerMaxLife);
  const altarRatio = safeRatio(stats?.altarLife, stats?.altarMaxLife);
  const victory = Boolean(stats) && eligible;
  const points = victory
    ? BONUS_RULES.victoryPoints
      + (playerRatio >= BONUS_RULES.healthyRatio ? BONUS_RULES.healthyPoints : 0)
      + (altarRatio >= BONUS_RULES.healthyRatio ? BONUS_RULES.healthyPoints : 0)
    : 0;
  return Object.freeze({
    eligible: victory,
    qualified: victory && points >= BONUS_RULES.qualificationThreshold,
    points,
    threshold: BONUS_RULES.qualificationThreshold,
    playerRatio,
    altarRatio
  });
}

export function calculateBonusScore(collected, total = BONUS_RULES.totalSouls) {
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : BONUS_RULES.totalSouls));
  const safeCollected = Math.max(0, Math.min(safeTotal, Math.floor(Number.isFinite(collected) ? collected : 0)));
  return safeCollected * BONUS_RULES.pointsPerSoul
    + (safeTotal > 0 && safeCollected === safeTotal ? BONUS_RULES.completionBonus : 0);
}
