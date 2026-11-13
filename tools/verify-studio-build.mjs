import fs from "node:fs/promises";
import vm from "node:vm";
import process from "node:process";
import { ASSET_MANIFEST } from "../src/assets.js";
import { GAME_VERSION } from "../src/version.js";

async function verify() {
  const file = process.argv[2] || `studio-builds/BoyPunk-Studio-v${GAME_VERSION}.html`;
  const content = await fs.readFile(file, "utf8");

  // 1. Check for external / unbundled references
  const forbidden = [
    /\b(?:src|href)=["'](?:https?:|\/\/|src\/|assets\/)/i,
    /url\(["']?(?:https?:|\/\/|assets\/)/i,
    /^\s*import\s/m
  ];

  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      throw new Error(`Forbidden pattern matched: ${pattern}`);
    }
  }

  // 2. Extract embedded script
  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error("No inline script found");
  const scriptCode = scriptMatch[1];

  // 3. Compile script
  try {
    new vm.Script(scriptCode, { filename: `BoyPunk-Studio-v${GAME_VERSION}.bundle.js` });
    console.log("Inline script compiled successfully with vm.Script");
  } catch (err) {
    console.error("Syntax error in inline script:", err);
    process.exit(1);
  }

  // 4. Check embedded assets object
  const assetsMatch = scriptCode.match(/globalThis\.__BOYPUNK_EMBEDDED_ASSETS__\s*=\s*(?:Object\.freeze\()?((?:\{)[\s\S]*?\})(?:\))?;/);
  if (!assetsMatch) throw new Error("globalThis.__BOYPUNK_EMBEDDED_ASSETS__ not found");
  const embeddedAssets = JSON.parse(assetsMatch[1]);
  const embeddedKeys = Object.keys(embeddedAssets);
  console.log(`Found ${embeddedKeys.length} embedded assets (all data URLs)`);

  for (const entry of ASSET_MANIFEST) {
    if (entry.type === "font") {
      if (!content.includes("data:font/ttf;base64,")) {
        throw new Error(`Font asset missing from inline CSS: ${entry.url}`);
      }
      continue;
    }
    if (!embeddedAssets[entry.url]) {
      throw new Error(`Asset missing from embedded map: ${entry.url}`);
    }
  }

  // 5. Check modules present
  const expectedModules = [
    "version.js", "config.js", "bonus.js", "level-data.js", "animation.js",
    "music.js", "core.js", "assets.js", "input.js", "audio.js",
    "renderer.js", "demo.js", "progression.js", "gamepad.js", "save-transfer.js", "i18n.js", "main.js"
  ];

  for (const mod of expectedModules) {
    if (!scriptCode.includes(`/* módulo: src/${mod} */`)) {
      throw new Error(`Module missing: ${mod}`);
    }
  }

  console.log(`Static verification PASSED: all ${expectedModules.length} modules present, all manifest assets embedded, 0 external deps.`);
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
