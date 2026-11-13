#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ASSET_MANIFEST } from "../src/assets.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleOrder = ["version.js", "config.js", "bonus.js", "level-data.js", "animation.js", "music.js", "core.js", "coop.js", "assets.js", "input.js", "audio.js", "renderer.js", "demo.js", "progression.js", "gamepad.js", "save-transfer.js", "i18n.js", "main.js"];
const mimeTypes = new Map([
  [".png", "image/png"], [".webm", "audio/webm"], [".ttf", "font/ttf"]
]);

async function inlineAssets(contents) {
  const pattern = /assets\/[A-Za-z0-9_./% -]+?\.(?:png|webm|ttf)/g;
  const references = [...new Set([
    ...contents.flatMap((content) => content.match(pattern) ?? []),
    ...ASSET_MANIFEST.map((entry) => entry.url)
  ])];
  const replacements = new Map();
  for (const reference of references) {
    const diskPath = path.join(projectRoot, decodeURIComponent(reference));
    const data = await readFile(diskPath);
    const mime = mimeTypes.get(path.extname(diskPath).toLowerCase());
    replacements.set(reference, `data:${mime};base64,${data.toString("base64")}`);
  }
  const inlined = contents.map((content) => {
    let result = content;
    for (const [reference, dataUrl] of replacements) result = result.replaceAll(reference, dataUrl);
    return result;
  });
  return { inlined, replacements };
}

function flattenModule(source, filename) {
  return `\n/* módulo: src/${filename} */\n${source}`
    .replace(/^import\s+[^;]+;\s*$/gm, "")
    .replace(/^export\s+/gm, "");
}

export async function buildPortable(outputFile = path.join(projectRoot, "dist-portable", "JOGAR.html")) {
  const [htmlSource, cssSource, ...moduleSources] = await Promise.all([
    readFile(path.join(projectRoot, "index.html"), "utf8"),
    readFile(path.join(projectRoot, "styles.css"), "utf8"),
    ...moduleOrder.map((filename) => readFile(path.join(projectRoot, "src", filename), "utf8"))
  ]);
  const { inlined: [html, css], replacements } = await inlineAssets([htmlSource, cssSource]);
  const modules = moduleSources;
  const bundle = modules.map((source, index) => flattenModule(source, moduleOrder[index])).join("\n");
  const runtimeAssetUrls = new Set(ASSET_MANIFEST
    .filter((entry) => entry.type === "image" || entry.type === "audio")
    .map((entry) => entry.url));
  const embeddedAssets = JSON.stringify(Object.fromEntries(
    [...replacements].filter(([reference]) => runtimeAssetUrls.has(reference))
  ));
  const generated = html
    .replace(/\s*<link rel="stylesheet" href="styles\.css">/, `\n    <style>\n${css}\n    </style>`)
    .replace(/\s*<script type="module" src="src\/main\.js"><\/script>/, `\n    <script>\n(() => {\n"use strict";\n// Mutable by design: the WebKit-safe loader releases each Base64 image string\n// after the corresponding HTMLImageElement has loaded.\nconst __boypunkPortableScript = document.currentScript;\nglobalThis.__BOYPUNK_EMBEDDED_ASSETS__ = ${embeddedAssets};\n${bundle}\n// Drop the DOM copy of this 8 MB inline source after parsing. The functions\n// remain compiled, while WebKit no longer needs to retain the script text node.\n__boypunkPortableScript?.remove();\n})();\n    </script>`)
    .replace("</head>", "    <!-- JOGAR.html gerado automaticamente; não editar manualmente. -->\n  </head>");

  if (/\b(?:src|href)=["'](?:https?:|\/\/|src\/|assets\/)/i.test(generated)) {
    throw new Error("O artefato portátil ainda contém referência externa ou local não incorporada.");
  }
  if (/^\s*import\s/m.test(bundle)) throw new Error("O bundle portátil ainda contém importação ES module.");
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, generated);
  return { outputFile, bytes: Buffer.byteLength(generated), modules: moduleOrder.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
  const result = await buildPortable(output);
  process.stdout.write(`Portátil gerado: ${result.outputFile} (${result.bytes} bytes, ${result.modules} módulos)\n`);
}
