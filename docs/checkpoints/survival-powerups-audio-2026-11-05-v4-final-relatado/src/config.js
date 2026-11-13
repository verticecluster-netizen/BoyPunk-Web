export const DEFAULT_DIFFICULTY = "normal";

export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({
    id: "easy",
    playerMaxLife: 6,
    altarMaxLife: 6,
    soulsGoal: 10,
    encounter: Object.freeze({
      openingDelayMultiplier: 1.25,
      spawnIntervalMultiplier: 1.25,
      maxEnemiesDelta: -1,
      budgetDelta: -1,
      maxEnemyShotsDelta: -1,
      maxProjectilesDelta: -2
    })
  }),
  normal: Object.freeze({
    id: "normal",
    playerMaxLife: 4,
    altarMaxLife: 4,
    soulsGoal: 15,
    encounter: Object.freeze({
      openingDelayMultiplier: 1,
      spawnIntervalMultiplier: 1,
      maxEnemiesDelta: 0,
      budgetDelta: 0,
      maxEnemyShotsDelta: 0,
      maxProjectilesDelta: 0
    })
  }),
  hard: Object.freeze({
    id: "hard",
    playerMaxLife: 3,
    altarMaxLife: 3,
    soulsGoal: 20,
    encounter: Object.freeze({
      openingDelayMultiplier: 0.75,
      spawnIntervalMultiplier: 0.75,
      maxEnemiesDelta: 2,
      budgetDelta: 2,
      maxEnemyShotsDelta: 1,
      maxProjectilesDelta: 4
    })
  })
});

export function normalizeDifficulty(value) {
  return Object.prototype.hasOwnProperty.call(DIFFICULTIES, value) ? value : DEFAULT_DIFFICULTY;
}

export const DEFAULT_CHARACTER = "boypunk";
export const CHARACTER_STORAGE_KEY = "boypunk-web-character-v1";

export const CHARACTERS = Object.freeze({
  boypunk: Object.freeze({
    id: "boypunk",
    publicName: "BoyPunk",
    nameKey: "character.boypunk.name",
    descKey: "character.boypunk.desc",
    tradeoffKey: "character.boypunk.tradeoff",
    abilityKey: "character.boypunk.ability",
    spritePrefix: "player",
    fallbackSpritePrefix: "player",
    provisionalVisual: false,
    attackCooldownMultiplier: 1.0,
    // Centro de contato do barril no frame attack1.2, relativo ao centro do
    // collider do jogador. O projétil usa esta âncora como centro, não como
    // top-left.
    weaponAnchor: Object.freeze({ forward: 27, y: 16 }),
    ability: null
  }),
  support: Object.freeze({
    id: "support",
    publicName: "Nilo",
    nameKey: "character.support.name",
    descKey: "character.support.desc",
    tradeoffKey: "character.support.tradeoff",
    abilityKey: "character.support.ability",
    spritePrefix: "nilo",
    fallbackSpritePrefix: "player",
    provisionalVisual: false,
    attackCooldownMultiplier: 1.20,
    // Centro da lente do emissor ilustrado no frame attack1.2.
    weaponAnchor: Object.freeze({ forward: 21, y: 12 }),
    ability: Object.freeze({
      id: "self-heal",
      publicName: "Cura Própria",
      nameKey: "ability.selfHeal.name",
      descKey: "ability.selfHeal.desc",
      healAmount: 1,
      rechargeSeconds: 20
    })
  })
});

export function normalizeCharacter(value) {
  return Object.prototype.hasOwnProperty.call(CHARACTERS, value) ? value : DEFAULT_CHARACTER;
}

export function loadCharacterPreference(storage) {
  try { return normalizeCharacter(storage?.getItem(CHARACTER_STORAGE_KEY)); }
  catch { return DEFAULT_CHARACTER; }
}

export function saveCharacterPreference(storage, characterId) {
  const normalized = normalizeCharacter(characterId);
  try { storage?.setItem(CHARACTER_STORAGE_KEY, normalized); }
  catch { /* a seleção continua válida somente nesta sessão */ }
  return normalized;
}

export function resolveCharacter(characterId, playerMaxLife = BALANCE.player.maxLife) {
  const id = normalizeCharacter(characterId);
  const char = CHARACTERS[id];
  const attackCooldown = Number((BALANCE.player.attackCooldown * char.attackCooldownMultiplier).toFixed(4));
  return Object.freeze({
    id: char.id,
    publicName: char.publicName,
    nameKey: char.nameKey,
    descKey: char.descKey,
    tradeoffKey: char.tradeoffKey,
    abilityKey: char.abilityKey,
    spritePrefix: char.spritePrefix,
    fallbackSpritePrefix: char.fallbackSpritePrefix,
    provisionalVisual: char.provisionalVisual,
    weaponAnchor: char.weaponAnchor,
    attackCooldown,
    attackCooldownMultiplier: char.attackCooldownMultiplier,
    maxLife: playerMaxLife,
    hasSelfHeal: Boolean(char.ability && char.ability.id === "self-heal"),
    ability: char.ability ? Object.freeze({ ...char.ability }) : null
  });
}

export function resolveWeaponAnchor(player, character, direction = player?.facing ?? 1) {
  const contract = character?.weaponAnchor ?? CHARACTERS.boypunk.weaponAnchor;
  const facing = direction >= 0 ? 1 : -1;
  return {
    x: player.x + player.w / 2 + facing * contract.forward,
    y: player.y + contract.y
  };
}

export const POWER_UPS = Object.freeze({
  "double-burst": Object.freeze({
    id: "double-burst",
    publicName: "Rajada Dupla",
    nameKey: "powerup.doubleBurst.name",
    durationSeconds: 10,
    projectilesPerAttack: 2,
    interShotDelaySeconds: 0.12,
    pickupLifetimeSeconds: 12,
    pickupWidth: 16,
    pickupHeight: 16,
    unlockRecoveredSouls: 4
  })
});

export const BALANCE = Object.freeze({
  player: Object.freeze({
    maxLife: 4,
    width: 22,
    height: 32,
    maxSpeed: 150,          // Velocidade horizontal máxima de chão e ar (px/s)
    acceleration: 1250,     // Aceleração no chão até maxSpeed (~0.12 s)
    friction: 1650,         // Desaceleração por atrito ao soltar direcionais (~0.09 s)
    gravity: 950,           // Aceleração da gravidade (px/s²)
    jumpSpeed: 310,         // Impulso inicial do salto simples (ápice teórico 50.58 px, folga +10.58 px sobre patamar de 40 px)
    doubleJumpSpeed: 285,   // Impulso do salto duplo (ápice 42.75 px, alcance vertical combinado de 93.33 px)
    variableJumpMinSpeed: 140, // Velocidade vertical mínima ascendente em corte antecipado de salto (micro-hop ~10.3 px)
    maxFallSpeed: 520,      // Velocidade terminal de queda vertical (px/s)
    coyoteTime: 0.09,       // Janela de tolerância após abandonar bordas de plataformas (90 ms / ~11 ticks)
    jumpBuffer: 0.12,       // Janela de retenção do comando de salto antes do pouso (120 ms / ~14 ticks)
    attackCooldown: 0.34,   // Intervalo mínimo entre ataques (s)
    attackDuration: 0.18,   // Duração da animação de ataque e colisor corpo a corpo (s)
    meleeDamage: 1,         // Dano autoritativo de um contato corpo a corpo aceito
    maxProjectiles: 8,      // Limite existente de projéteis simultâneos do jogador
    shotSpeed: 330,         // Velocidade de deslocamento do projétil do jogador (px/s)
    shotDamage: 1,          // Dano autoritativo carregado por cada Bola de Pulso
    invulnerability: 0.9    // Duração da imunidade pós-dano (s)
  }),
  encounter: Object.freeze({
    maxEnemies: 5,
    maxProjectiles: 12,
    openingDelay: 4.5,
    minimumShotGap: 0.72,
    chaserMaxHp: 3,
    chaserSpeed: 52,
    chaserPatrolSpeedMultiplier: 0.6,
    chaserPatrolRadius: 56,
    chaserDetectionEnterDistance: 150,
    chaserDetectionExitDistance: 180,
    chaserAcceleration: 420,
    chaserBlockedTurnSeconds: 0.18,
    chaserJumpSpeed: 300,
    chaserAttackCooldown: 1.15,
    chaserHurtFlashSeconds: 0.14,
    shooterTelegraph: 0.82,
    shooterRecovery: 1.35,
    shooterShotSpeed: 118,
    shooterShotsBeforeExit: 4,
    patrolShooter: Object.freeze({
      campaignEnabled: true,
      survivalEnabled: false,
      demoEnabled: false,
      replacementEvery: 2,
      eligiblePhaseIds: Object.freeze(["confronto", "reta-final", "compactacao", "expedicao"]),
      encounterCost: 2,
      maxActiveRanged: 2,
      width: 16,
      height: 32,
      patrolSpeed: 34,
      edgeClearance: 3,
      minimumPatrolSeconds: 0.75,
      aimSeconds: 0.9,
      fireSeconds: 1 / 120,
      fireFeedbackSeconds: 0.08,
      recoverySeconds: 1.25,
      range: 210,
      muzzleForward: 10,
      muzzleY: 13,
      projectileSpeed: 118
    }),
    phases: Object.freeze([
      Object.freeze({ id: "aprendizado", from: 0, budget: 2, maxEnemies: 2, maxEnemyShots: 0, spawnInterval: 3.25, shooterEvery: 0 }),
      Object.freeze({ id: "alerta", from: 4, budget: 4, maxEnemies: 3, maxEnemyShots: 2, spawnInterval: 2.7, shooterEvery: 3 }),
      Object.freeze({ id: "confronto", from: 8, budget: 5, maxEnemies: 4, maxEnemyShots: 3, spawnInterval: 2.3, shooterEvery: 2 }),
      Object.freeze({ id: "reta-final", from: 12, budget: 6, maxEnemies: 5, maxEnemyShots: 4, spawnInterval: 2.05, shooterEvery: 2 })
    ])
  }),
  survival: Object.freeze({
    playerMaxLife: 4,
    baseEnemyCount: 3,
    enemiesPerWave: 1,
    maxEnemiesPerWave: 18,
    shooterStartsAtWave: 2,
    speedIncreasePerWave: 0.055,
    maxSpeedMultiplier: 1.75,
    intermissionSeconds: 1.2,
    supportPickupRespawnSeconds: Object.freeze({
      health: 18,
      "rapid-fire": 22,
      shield: 24,
      "double-burst": 30
    })
  }),
  objective: Object.freeze({
    soulsGoal: 15,
    altarMaxLife: 4,
    altarInvulnerability: 1.2,
    depositRadius: 54
  }),
  presentation: Object.freeze({
    playerDefeatSeconds: 0.4,
    chaserDefeatSeconds: 4 / 12,
    maxDefeatVisuals: 8,
    victorySeconds: 0.85,
    reducedMotionVictorySeconds: 0.18
  }),
  levels: Object.freeze({
    currentId: "district-neon",
    nextId: "scrap-factory",
    bonusId: "energy-chamber"
  }),
  demo: Object.freeze({
    seed: 0x425059,
    menuIdleSeconds: 120,
    maxRunSeconds: 90,
    stagnationSeconds: 24,
    restartDelaySeconds: 2.4,
    maxConsecutiveFailures: 3
  })
});
