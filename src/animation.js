export const PLAYER_ANIMATIONS = Object.freeze({
  idle: Object.freeze({ frames: 4, speed: 5 }),
  walk: Object.freeze({ frames: 4, speed: 12 }),
  jump: Object.freeze({ frames: 1, speed: 1 }),
  fall: Object.freeze({ frames: 1, speed: 1 }),
  attack1: Object.freeze({ frames: 4, speed: 22 }),
  hurt: Object.freeze({ frames: 3, speed: 12 }),
  die: Object.freeze({ frames: 4, speed: 10, loop: false })
});

export const CHASER_ANIMATIONS = Object.freeze({
  idle: Object.freeze({ frames: 2, speed: 3 }),
  walk: Object.freeze({ frames: 8, speed: 12 }),
  jump: Object.freeze({ frames: 2, speed: 6 }),
  attack: Object.freeze({ frames: 4, speed: 22 }),
  dead: Object.freeze({ frames: 4, speed: 12, loop: false })
});

export const PATROL_SHOOTER_ANIMATIONS = Object.freeze({
  patrol: Object.freeze({ frames: 8, speed: 12 }),
  aim: Object.freeze({ frames: 4, speed: 4 / 0.9, loop: false }),
  fire: Object.freeze({ frames: 1, speed: 120, loop: false }),
  recovery: Object.freeze({ frames: 4, speed: 4 / 0.28, loop: false })
});

export function playerAnimationState(player) {
  if (player.life <= 0) return "die";
  if (player.attackTimer > 0) return "attack1";
  if (player.hurtFlash > 0) return "hurt";
  if (!player.onGround) return player.vy < 0 ? "jump" : "fall";
  if (Math.abs(player.vx) > 8) return "walk";
  return "idle";
}

export function chaserAnimationState(enemy) {
  if (enemy.dying) return "dead";
  if (enemy.attackFlash > 0) return "attack";
  if (!enemy.onGround) return "jump";
  if (Math.abs(enemy.vx) > 4) return "walk";
  return "idle";
}

export function advanceAnimationClock(entity, state, dt) {
  if (entity.animState !== state) {
    entity.animState = state;
    entity.animTime = 0;
  } else {
    entity.animTime = (entity.animTime ?? 0) + dt;
  }
}

export function animationFrame(entity, definition) {
  const frame = Math.floor((entity.animTime ?? 0) * definition.speed);
  return definition.loop === false ? Math.min(definition.frames - 1, frame) : frame % definition.frames;
}
