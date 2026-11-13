#!/usr/bin/env node
import { closeSync, createReadStream, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { mkdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { GAME_VERSION } from "../src/version.js";

const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const requestedRoot = path.resolve(valueAfter("--root", process.cwd()));
const root = await realpath(requestedRoot);
const host = valueAfter("--host", process.env.BOYPUNK_DEV_HOST || "127.0.0.1");
if (host !== "127.0.0.1") throw new Error("Host inválido: o servidor de desenvolvimento aceita somente 127.0.0.1.");
const port = Number.parseInt(valueAfter("--port", process.env.BOYPUNK_DEV_PORT || "47831"), 10);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Porta inválida.");

let stateBase = "/tmp";
let stateDir = path.join(stateBase, `boypunk-web-${process.getuid?.() ?? "user"}`);
try {
  await mkdir(stateDir, { recursive: true });
  await writeFile(path.join(stateDir, ".write-test"), "ok");
  await rm(path.join(stateDir, ".write-test"));
} catch {
  stateBase = "/tmp";
  stateDir = path.join(stateBase, `boypunk-web-${process.getuid?.() ?? "user"}`);
  await mkdir(stateDir, { recursive: true });
}

const pidFile = path.join(stateDir, "server.pid");
const portFile = path.join(stateDir, "server.port");
if (args.includes("--daemon")) {
  const logFile = path.join(stateDir, "server.log");
  await Promise.allSettled([rm(pidFile), rm(portFile)]);
  const logFd = openSync(logFile, "a");
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--root", root, "--host", host, "--port", String(port)], {
    cwd: root,
    detached: true,
    stdio: ["ignore", logFd, logFd]
  });
  child.unref();
  closeSync(logFd);
  let activePort = null;
  let verified = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const recordedPid = (await readFile(pidFile, "utf8")).trim();
      activePort = Number.parseInt((await readFile(portFile, "utf8")).trim(), 10);
      if (recordedPid === String(child.pid) && Number.isInteger(activePort)) {
        const response = await fetch(`http://${host}:${activePort}/__boypunk_health`);
        const health = await response.json();
        if (response.ok && health.application === "boypunk-web-local-v1" && health.root === root) {
          verified = true;
          break;
        }
      }
    } catch { activePort = null; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!verified || !activePort) {
    try { process.kill(child.pid, "SIGTERM"); } catch { /* processo já terminou */ }
    throw new Error(`Servidor destacado não ficou disponível. Consulte ${logFile}`);
  }
  process.stdout.write(`Servidor BoyPunk! destacado e verificado (PID ${child.pid}).\n`);
  process.stdout.write(`BoyPunk! local: http://127.0.0.1:${activePort}/\n`);
  process.exit(0);
}
if (args.includes("--launch-existing")) {
  const launcher = spawn(path.join(root, "iniciar-jogo.sh"), [], {
    cwd: "/tmp",
    stdio: "inherit"
  });
  const exitCode = await new Promise((resolve) => launcher.once("exit", (code) => resolve(code ?? 1)));
  process.exit(exitCode);
}
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".webm", "audio/webm"],
  [".ttf", "font/ttf"]
]);

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", `http://${host}`);
    if (requestUrl.pathname === "/__boypunk_health") {
      const body = JSON.stringify({ application: "boypunk-web-local-v1", version: GAME_VERSION, root, pid: process.pid, host, port: server.address()?.port ?? port });
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }).end(body);
      return;
    }
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === "/") pathname = "/index.html";
    const candidate = path.resolve(root, `.${pathname}`);
    if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(candidate);
    if (!info.isFile()) throw Object.assign(new Error("Not found"), { code: "ENOENT" });
    response.writeHead(200, {
      "Content-Type": mimeTypes.get(path.extname(candidate).toLowerCase()) || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(candidate).pipe(response);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error.code === "ENOENT" ? "Not found" : "Internal server error");
  }
});

server.listen(port, host, async () => {
  const address = server.address();
  await writeFile(pidFile, `${process.pid}\n`);
  await writeFile(portFile, `${address.port}\n`);
  const url = `http://${host}:${address.port}/`;
  process.stdout.write(`BoyPunk! local: ${url}\n`);
  if (args.includes("--browser-test")) {
    try {
      const { runBrowserTest } = await import("./browser-test.mjs");
      const report = await runBrowserTest({
        url,
        root,
        evidenceDir: path.resolve(valueAfter("--evidence-dir", path.join(root, "evidencias")))
      });
      process.stdout.write(`Teste de navegador: ${report.passed ? "APROVADO" : "REPROVADO"}\n`);
    } catch (error) {
      process.stderr.write(`Teste de navegador: REPROVADO\n${error.stack || error.message}\n`);
      process.exitCode = 1;
    }
    if (!valueAfter("--portable-test", "")) {
      try {
        const recordedPid = (await readFile(pidFile, "utf8")).trim();
        if (recordedPid === String(process.pid)) await Promise.allSettled([rm(pidFile), rm(portFile)]);
      } catch { /* estado já removido */ }
      server.close(() => process.exit(process.exitCode ?? 0));
    }
  }
  const portableTestPath = valueAfter("--portable-test", "");
  if (portableTestPath) {
    try {
      const portable = await realpath(path.resolve(portableTestPath));
      const { runBrowserTest } = await import("./browser-test.mjs");
      const report = await runBrowserTest({
        url: pathToFileURL(portable).href,
        root,
        evidenceDir: path.join(root, "evidencias", "portable"),
        testLauncher: false,
        requireOffline: true
      });
      process.stdout.write(`Teste portátil: ${report.passed ? "APROVADO" : "REPROVADO"}\n`);
    } catch (error) {
      process.stderr.write(`Teste portátil: REPROVADO\n${error.stack || error.message}\n`);
      process.exitCode = 1;
    } finally {
      try {
        const recordedPid = (await readFile(pidFile, "utf8")).trim();
        if (recordedPid === String(process.pid)) await Promise.allSettled([rm(pidFile), rm(portFile)]);
      } catch { /* estado já removido */ }
      server.close(() => process.exit(process.exitCode ?? 0));
    }
  }
});

const shutdown = async () => {
  server.close(async () => {
    try {
      const recordedPid = (await readFile(pidFile, "utf8")).trim();
      if (recordedPid === String(process.pid)) await Promise.allSettled([rm(pidFile), rm(portFile)]);
    } catch { /* estado já removido */ }
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
