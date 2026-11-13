#!/usr/bin/env node
import { realpath } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { runBrowserTest } from "./browser-test.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const requested = process.argv[2];
if (!requested) throw new Error("Uso: node tools/portable-test.mjs /caminho/JOGAR.html");
const portable = await realpath(path.resolve(requested));
const report = await runBrowserTest({
  url: pathToFileURL(portable).href,
  root,
  evidenceDir: path.join(root, "evidencias", "portable"),
  testLauncher: false,
  requireOffline: true
});
process.stdout.write(`Teste portátil: ${report.passed ? "APROVADO" : "REPROVADO"}\n`);
