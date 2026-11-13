#!/usr/bin/env node
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { buildPortable } from "./build-portable.mjs";

const execFile = promisify(execFileCallback);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const packageName = `BoyPunk-Web-v${packageJson.version}`;
const releasesDir = path.join(projectRoot, "releases");
const stageDir = path.join(releasesDir, packageName);
const zipPath = path.join(releasesDir, `${packageName}.zip`);

await mkdir(releasesDir, { recursive: true });
await rm(stageDir, { recursive: true, force: true });
await rm(zipPath, { force: true });
await mkdir(path.join(stageDir, "DOCUMENTACAO"), { recursive: true });

await buildPortable(path.join(stageDir, "JOGAR.html"));
await cp(path.join(projectRoot, "packaging", "LEIA-ME.txt"), path.join(stageDir, "LEIA-ME.txt"));
for (const name of ["DEPENDENCIAS-E-COMANDOS.txt", "CREDITOS-E-AVISOS.txt", "RELATORIO-DE-TESTES.txt", "MODELO-DE-FEEDBACK.txt"]) {
  await cp(path.join(projectRoot, "packaging", name), path.join(stageDir, "DOCUMENTACAO", name));
}
await cp(path.join(projectRoot, "docs", "ANALISE-E-COMPOSICAO-MUSICAL.md"), path.join(stageDir, "DOCUMENTACAO", "ANALISE-E-COMPOSICAO-MUSICAL.md"));

const sourceDir = path.join(stageDir, "FONTES");
await mkdir(sourceDir, { recursive: true });
const sourceEntries = [
  "assets", "src", "tools", "tests", "packaging", "docs", "index.html", "styles.css", "health.json",
  "package.json", "iniciar-jogo.sh", "abrir-bonus.sh", "README.md", "CONTINUIDADE_BOYPUNK_WEB.md", "RELATORIO_BOYPUNK_WEB_PARA_CHATGPT.md"
];
for (const entry of sourceEntries) {
  await cp(path.join(projectRoot, entry), path.join(sourceDir, entry), {
    recursive: true,
    filter: (source) => !source.endsWith(`${path.sep}battle-music.webm`) && !source.includes(`${path.sep}node_modules${path.sep}`)
  });
}

await execFile("zip", ["-q", "-r", "-9", zipPath, packageName], { cwd: releasesDir });
const zip = await readFile(zipPath);
const sha256 = createHash("sha256").update(zip).digest("hex");
await writeFile(`${zipPath}.sha256`, `${sha256}  ${path.basename(zipPath)}\n`);
process.stdout.write(`${JSON.stringify({ packageName, stageDir, zipPath, bytes: zip.length, sha256 }, null, 2)}\n`);
