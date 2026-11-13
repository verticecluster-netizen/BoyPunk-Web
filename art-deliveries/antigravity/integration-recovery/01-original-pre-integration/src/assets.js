const image = (key, url, required = false) => ({ type: "image", key, url, required });
const audio = (key, url) => ({ type: "audio", key, url, required: false });
const font = (key, url, family) => ({ type: "font", key, url, family, required: false });
const resolveAssetUrl = (url) => globalThis.__BOYPUNK_EMBEDDED_ASSETS__?.[url] ?? url;
export const ASSET_LOAD_TIMEOUT_MS = 12000;
export const MEDIA_LOAD_TIMEOUT_MS = 5000;

function releaseEmbeddedImage(url) {
  const embedded = globalThis.__BOYPUNK_EMBEDDED_ASSETS__;
  if (!embedded || !Object.prototype.hasOwnProperty.call(embedded, url)) return;
  try { delete embedded[url]; }
  catch { /* builds antigos podem fornecer um mapa congelado */ }
}

const playerFrames = (state, count) => Array.from({ length: count }, (_, index) => image(
  `player.${state}.${index}`,
  `assets/images/player-helmet/playeranim-${state}-${String(index).padStart(3, "0")}.png`,
  state === "idle" && index === 0
));

const niloFrames = (state, count) => Array.from({ length: count }, (_, index) => image(
  `nilo.${state}.${index}`,
  `assets/images/characters/nilo/nilo-${state}-${String(index).padStart(3, "0")}.png`,
  state === "idle" && index === 0
));

const turretFrames = (state, count) => Array.from({ length: count }, (_, index) => image(
  `turret.${state}.${index}`,
  `assets/images/enemies/enemytorreta-${state}-${String(index).padStart(3, "0")}.png`
));

const patrolShooterFrames = (state, count) => Array.from({ length: count }, (_, index) => image(
  `patrolShooter.${state}.${index}`,
  `assets/images/enemies/enemypatrolshooter-${state}-${String(index).padStart(3, "0")}.png`,
  state === "patrol" && index === 0
));

const chaserFrames = (state, count) => Array.from({ length: count }, (_, index) => image(
  `chaser.${state}.${index}`,
  `assets/images/enemies/enemycaveira-${state}-${String(index).padStart(3, "0")}.png`,
  state === "idle" && index === 0
));

const playerIllustratedFrames = (state, count) => Array.from({ length: count }, (_, index) => image(
  `player.illustrated.${state}.${index}`,
  `assets/images/characters/boypunk-illustrated/playeranim-${state}-${String(index).padStart(3, "0")}.png`,
  false
));

const niloIllustratedFrames = (state, count) => Array.from({ length: count }, (_, index) => image(
  `nilo.illustrated.${state}.${index}`,
  `assets/images/characters/nilo-illustrated/nilo-${state}-${String(index).padStart(3, "0")}.png`,
  false
));

const chaserIllustratedFrames = (state, count) => Array.from({ length: count }, (_, index) => image(
  `chaser.illustrated.${state}.${index}`,
  `assets/images/enemies/chaser-illustrated/enemycaveira-${state}-${String(index).padStart(3, "0")}.png`,
  false
));

const patrolShooterIllustratedFrames = (state, count) => Array.from({ length: count }, (_, index) => image(
  `patrolShooter.illustrated.${state}.${index}`,
  `assets/images/enemies/patrol-shooter-illustrated/enemypatrolshooter-${state}-${String(index).padStart(3, "0")}.png`,
  false
));

export const ASSET_MANIFEST = [
  image("world.background", "assets/images/world/distrito-neon.png", true),
  image("world.background.factory", "assets/images/world/fabrica-sucata.png"),
  image("world.background.bonus", "assets/images/world/camara-energia.png"),
  image("world.background.cyberlab", "assets/images/world/cyber-lab.png"),
  image("world.tiles", "assets/images/world/platformtiles.png", true),
  image("world.tiles.factory", "assets/images/world/factory-platformtiles.png"),
  image("world.tiles.bonus", "assets/images/world/energy-platformtiles.png"),
  image("world.tiles.cyberlab", "assets/images/world/cyber-lab-platformtiles.png"),
  image("world.texture", "assets/images/world/tilebg.png"),
  ...playerFrames("idle", 4),
  ...playerFrames("walk", 4),
  ...playerFrames("jump", 1),
  ...playerFrames("fall", 1),
  ...playerFrames("attack1", 4),
  ...playerFrames("hurt", 3),
  ...playerFrames("die", 4),
  image("player.bullet", "assets/images/player-helmet/bulletcandymachine-normal-000.png"),
  image("player.portrait.0", "assets/images/player-helmet/player-portrait-000.png"),
  ...niloFrames("idle", 4),
  ...niloFrames("walk", 4),
  ...niloFrames("jump", 1),
  ...niloFrames("fall", 1),
  ...niloFrames("attack1", 4),
  ...niloFrames("hurt", 3),
  ...niloFrames("die", 4),
  image("nilo.portrait.0", "assets/images/characters/nilo/nilo-portrait-000.png"),
  ...Array.from({ length: 4 }, (_, index) => image(
    `nilo.heal.${index}`,
    `assets/images/characters/nilo/nilo-heal-${String(index).padStart(3, "0")}.png`
  )),
  image("chaser.idle", "assets/images/enemies/enemycaveira-iddle-000.png", true),
  image("chaser.idle.0", "assets/images/enemies/enemycaveira-iddle-000.png", true),
  image("chaser.idle.1", "assets/images/enemies/enemycaveira-iddle-001.png"),
  image("chaser.walk", "assets/images/enemies/enemycaveira-walk-000.png"),
  ...chaserFrames("walk", 8),
  image("chaser.jump", "assets/images/enemies/enemycaveira-jump-000.png"),
  ...chaserFrames("jump", 2),
  image("chaser.attack", "assets/images/enemies/enemycaveira-attack-000.png"),
  ...chaserFrames("attack", 4),
  image("chaser.dead", "assets/images/enemies/enemycaveira-dead-000.png"),
  ...chaserFrames("dead", 4),
  image("enemy.bullet", "assets/images/enemies/enemybalabasic-walk-000.png"),
  ...turretFrames("created", 5),
  ...turretFrames("shooting", 4),
  ...turretFrames("patrol", 8),
  image("turret.ready.0", "assets/images/enemies/enemytorreta-ready-000.png", true),
  ...patrolShooterFrames("patrol", 8),
  ...patrolShooterFrames("aim", 4),
  image("patrolShooter.fire.0", "assets/images/enemies/enemypatrolshooter-fire-000.png"),
  ...patrolShooterFrames("recovery", 4),
  ...Array.from({ length: 4 }, (_, index) => image(
    `soul.${index}`,
    `assets/images/world/souls-animation%201-${String(index).padStart(3, "0")}.png`,
    index === 0
  )),
  ...Array.from({ length: 4 }, (_, index) => image(
    `soul.cyber.${index}`,
    `assets/images/world/soul-cyber-${String(index).padStart(3, "0")}.png`,
    false
  )),
  ...Array.from({ length: 4 }, (_, index) => image(
    `bonusSoul.${index}`,
    `assets/images/world/bonus-soul-${String(index).padStart(3, "0")}.png`
  )),
  ...Array.from({ length: 7 }, (_, index) => image(
    `altar.${index}`,
    `assets/images/world/altar-full-${String(index).padStart(3, "0")}.png`,
    index === 0
  )),
  ...Array.from({ length: 7 }, (_, index) => image(
    `altar.distrito-neon.${index}`,
    `assets/images/world/altar-distrito-neon-${String(index).padStart(3, "0")}.png`,
    false
  )),
  ...Array.from({ length: 7 }, (_, index) => image(
    `altar.scrap-factory.${index}`,
    `assets/images/world/altar-fabrica-sucata-${String(index).padStart(3, "0")}.png`,
    false
  )),
  ...Array.from({ length: 4 }, (_, index) => image(
    `powerUp.double-burst.idle.${index}`,
    `assets/images/world/powerup-double-burst-idle-${String(index).padStart(3, "0")}.png`,
    index === 0
  )),
  image("powerUp.double-burst.idle", "assets/images/world/powerup-double-burst-idle-000.png", true),
  ...playerIllustratedFrames("idle", 4),
  ...playerIllustratedFrames("walk", 4),
  ...playerIllustratedFrames("jump", 1),
  ...playerIllustratedFrames("fall", 1),
  ...playerIllustratedFrames("attack1", 4),
  ...playerIllustratedFrames("hurt", 3),
  ...playerIllustratedFrames("die", 4),
  image("player.bullet.illustrated", "assets/images/characters/boypunk-illustrated/bulletcandymachine-normal-000.png"),
  ...niloIllustratedFrames("idle", 4),
  ...niloIllustratedFrames("walk", 4),
  ...niloIllustratedFrames("jump", 1),
  ...niloIllustratedFrames("fall", 1),
  ...niloIllustratedFrames("attack1", 4),
  ...niloIllustratedFrames("hurt", 3),
  ...niloIllustratedFrames("die", 4),
  image("chaser.illustrated.idle.0", "assets/images/enemies/chaser-illustrated/enemycaveira-idle-000.png"),
  image("chaser.illustrated.idle.1", "assets/images/enemies/chaser-illustrated/enemycaveira-idle-001.png"),
  ...chaserIllustratedFrames("walk", 8),
  ...chaserIllustratedFrames("attack", 4),
  ...chaserIllustratedFrames("dead", 4),
  image("enemy.bullet.illustrated", "assets/images/enemies/chaser-illustrated/enemybalabasic-walk-000.png"),
  ...Array.from({ length: 7 }, (_, index) => image(
    `altar.distrito-neon.illustrated.${index}`,
    `assets/images/world/altar-distrito-neon-illustrated-${String(index).padStart(3, "0")}.png`,
    false
  )),
  ...patrolShooterIllustratedFrames("patrol", 8),
  ...patrolShooterIllustratedFrames("aim", 4),
  image("patrolShooter.illustrated.fire.0", "assets/images/enemies/patrol-shooter-illustrated/enemypatrolshooter-fire-000.png"),
  ...patrolShooterIllustratedFrames("recovery", 4),
  font("ui", "assets/fonts/PixelifySans.ttf", "Pixelify Sans"),
  audio("menu", "assets/audio/menu-music.webm"),
  audio("attack", "assets/audio/attack.webm"),
  audio("damage", "assets/audio/damage.webm"),
  audio("collect", "assets/audio/collect.webm"),
  audio("deposit", "assets/audio/deposit.webm"),
  audio("button", "assets/audio/button.webm"),
  audio("start", "assets/audio/start.webm")
];

function releaseImageSource(element) {
  element.onload = null;
  element.onerror = null;
  try {
    // The standalone build assigns a multi-megabyte data URL here. Clearing it
    // after copying the decoded pixels is what allows WebKit to collect it.
    element.src = "";
  } catch { /* best-effort cleanup for unusual Image implementations */ }
}

async function detachDecodedImage(element, entry) {
  if (typeof globalThis.createImageBitmap === "function") {
    try {
      return await globalThis.createImageBitmap(element);
    } catch { /* Safari versions without this overload use the canvas fallback */ }
  }

  const documentRef = globalThis.document;
  if (!documentRef?.createElement) return element;
  const width = element.naturalWidth || element.width;
  const height = element.naturalHeight || element.height;
  if (!width || !height) throw new Error(`Imagem decodificada sem dimensões: ${entry.url}`);
  const canvas = documentRef.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(`Canvas 2D indisponível para copiar: ${entry.url}`);
  context.drawImage(element, 0, 0);
  return canvas;
}

export function loadImageAsset(entry, timeoutMs = ASSET_LOAD_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const element = new Image();
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      element.onload = null;
      element.onerror = null;
      callback(value);
    };
    const timeout = setTimeout(() => {
      releaseImageSource(element);
      finish(reject, new Error(`Tempo esgotado ao carregar imagem: ${entry.url}`));
    }, timeoutMs);
    element.decoding = "async";
    // WebKit is more reliable with the classic load/error events than with
    // HTMLImageElement.decode(), especially for embedded data URLs.
    element.onload = async () => {
      try {
        const drawable = await detachDecodedImage(element, entry);
        releaseImageSource(element);
        finish(resolve, drawable);
      } catch (error) {
        releaseImageSource(element);
        finish(reject, error);
      }
    };
    element.onerror = () => {
      releaseImageSource(element);
      finish(reject, new Error(`Imagem indisponível: ${entry.url}`));
    };
    element.src = resolveAssetUrl(entry.url);
  });
}

export function loadAudioAsset(entry, timeoutMs = MEDIA_LOAD_TIMEOUT_MS) {
  const url = resolveAssetUrl(entry.url);
  return new Promise((resolve, reject) => {
    const element = new Audio();
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      element.onloadedmetadata = null;
      element.onerror = null;
      try {
        element.pause();
        element.removeAttribute?.("src");
        element.load?.();
      } catch { /* decoder cleanup is best effort */ }
      callback(value);
    };
    const timeout = setTimeout(() => {
      finish(reject, new Error(`Tempo esgotado ao carregar áudio: ${entry.url}`));
    }, timeoutMs);
    element.preload = "metadata";
    element.onloadedmetadata = () => finish(resolve, url);
    element.onerror = () => {
      const code = element.error?.code;
      const detail = code ? ` (MediaError ${code})` : "";
      finish(reject, new Error(`Áudio indisponível: ${entry.url}${detail}`));
    };
    element.src = url;
    try {
      element.load?.();
    } catch (error) {
      finish(reject, error);
    }
  });
}

export function loadFontAsset(entry, timeoutMs = MEDIA_LOAD_TIMEOUT_MS) {
  const fonts = globalThis.document?.fonts;
  if (!fonts?.load) return Promise.resolve(entry.family);
  let timeout;
  const stalled = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Tempo esgotado ao carregar fonte: ${entry.url}`)), timeoutMs);
  });
  return Promise.race([fonts.load(`16px "${entry.family}"`), stalled])
    .then((loaded) => {
      if (!loaded?.length) throw new Error(`Fonte indisponível: ${entry.url}`);
      return entry.family;
    })
    .finally(() => clearTimeout(timeout));
}

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function loadAssetManifest(manifest, onProgress = () => {}, options = {}) {
  const images = new Map();
  const audioUrls = new Map();
  const fonts = new Map();
  const failures = [];
  const imageLoader = options.imageLoader ?? loadImageAsset;
  const audioLoader = options.audioLoader ?? loadAudioAsset;
  const fontLoader = options.fontLoader ?? loadFontAsset;
  const yieldControl = options.yieldControl ?? yieldToBrowser;
  const logger = options.logger ?? console;
  const onAssetStart = options.onAssetStart ?? (() => {});
  const onAssetError = options.onAssetError ?? (() => {});
  const loadedImagesByUrl = new Map();
  let completed = 0;

  const reportProgress = (entry) => {
    completed += 1;
    try {
      onProgress(completed, manifest.length, entry);
    } catch (error) {
      logger.warn?.("[BoyPunk assets] Callback de progresso falhou:", error);
    }
  };

  // Intentionally sequential. The portable build stores assets as Base64 data
  // URLs, and decoding dozens of them in parallel can exhaust WebKit's memory.
  for (const entry of manifest) {
    let requiredFailure = null;
    try {
      try { onAssetStart(entry, completed, manifest.length); }
      catch (error) { logger.warn?.("[BoyPunk assets] Callback de início falhou:", error); }
      if (entry.type === "image") {
        let value = loadedImagesByUrl.get(entry.url);
        if (!value) {
          value = await imageLoader(entry);
          loadedImagesByUrl.set(entry.url, value);
        }
        images.set(entry.key, value);
      } else if (entry.type === "audio") {
        audioUrls.set(entry.key, await audioLoader(entry));
      } else if (entry.type === "font") {
        fonts.set(entry.key, await fontLoader(entry));
      } else {
        throw new Error(`Tipo de recurso desconhecido: ${entry.type}`);
      }
    } catch (error) {
      failures.push({ ...entry, error });
      logger.warn?.(`[BoyPunk assets] Falha em ${entry.key} (${entry.url}):`, error);
      try { onAssetError(entry, error); }
      catch (callbackError) { logger.warn?.("[BoyPunk assets] Callback de erro falhou:", callbackError); }
      if (entry.required) requiredFailure = error;
    } finally {
      if (entry.type === "image") releaseEmbeddedImage(entry.url);
      reportProgress(entry);
    }

    if (requiredFailure) break;
    await yieldControl();
  }

  const requiredFailures = failures.filter((failure) => failure.required);
  if (requiredFailures.length) {
    const failure = requiredFailures[0];
    const message = failure.error?.message ?? String(failure.error);
    throw new Error(`Recurso obrigatório falhou: ${failure.url}\n${message}`);
  }

  return { images, audioUrls, fonts, failures };
}

export function loadAssets(onProgress = () => {}, options = {}) {
  return loadAssetManifest(ASSET_MANIFEST, onProgress, options);
}
