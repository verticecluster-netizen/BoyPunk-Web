#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultSource = path.resolve(here, "../../BoyPunk/layouts/Gameplay.json");
const source = process.argv[2] ? path.resolve(process.argv[2]) : defaultSource;
const layout = JSON.parse(await readFile(source, "utf8"));
const solids = layout.layers.find((layer) => layer.name === "solids");

if (!solids) throw new Error("A camada 'solids' não foi encontrada.");

const platforms = solids.instances
  .filter((instance) => instance.type === "Platform")
  .map((instance) => ({
    x: instance.world.x,
    y: instance.world.y,
    w: instance.world.width,
    h: instance.world.height,
    oneWay: Boolean(instance.behaviors?.Jumpthru?.properties?.enabled)
  }));

const gameplay = layout.layers.find((layer) => layer.name === "game")?.instances ?? [];
const positions = (type) => gameplay
  .filter((instance) => instance.type === type)
  .map((instance) => ({ x: instance.world.x, y: instance.world.y }));

const extracted = {
  source,
  dimensions: { width: layout.width, height: layout.height },
  platforms,
  player: positions("PlayerColider")[0],
  enemyGenerators: positions("Gerador"),
  turretGenerators: positions("geradorTorreta")
};

process.stdout.write(`${JSON.stringify(extracted, null, 2)}\n`);
