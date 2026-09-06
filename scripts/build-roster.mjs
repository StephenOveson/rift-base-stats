#!/usr/bin/env node
/**
 * Regenerates rift-roster-artifact.jsx from Riot's Data Dragon.
 *
 * Exits 0 and writes nothing when the live patch already matches the one baked
 * into the artifact, so a scheduled run is a no-op between patches. Exits 1 on
 * a failed sanity check — better to leave the last good file in place and let
 * the job go red than to silently commit bad numbers.
 *
 *   node build-roster.mjs [--force]
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(HERE, "artifact.template.jsx");
const OUTPUT = resolve(HERE, "rift-roster-artifact.jsx");
const DDRAGON = "https://ddragon.leagueoflegends.com";

/** Column order must match the STATS accessors in the template. */
const toRow = (c) => [
  c.name,
  c.stats.hp, c.stats.hpperlevel,
  c.stats.hpregen, c.stats.hpregenperlevel,
  c.stats.attackdamage, c.stats.attackdamageperlevel,
  c.stats.attackspeed, c.stats.attackspeedperlevel,
  c.stats.armor, c.stats.armorperlevel,
  c.stats.spellblock, c.stats.spellblockperlevel,
  c.stats.movespeed,
];

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

const bakedPatch = async () => {
  try {
    const m = (await readFile(OUTPUT, "utf8")).match(/const PATCH = "([^"]+)"/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
};

function check(rows) {
  const problems = [];

  // Roster size. A collapse here means a malformed or partial response.
  if (rows.length < 150) problems.push(`only ${rows.length} champions parsed`);

  // Every numeric cell must actually be a number.
  for (const r of rows) {
    if (r.slice(1).some((v) => typeof v !== "number" || Number.isNaN(v))) {
      problems.push(`non-numeric stat on ${r[0]}`);
      break;
    }
  }

  // Riot has shipped builds where attackdamageperlevel is 0 for the entire
  // roster. That is a Riot data fault, not a parsing one, and it would quietly
  // flatten AD scaling across the whole artifact. Refuse to build on it.
  if (rows.every((r) => !r[6])) {
    problems.push("attackdamageperlevel is 0 for every champion — upstream data fault");
  }

  return problems;
}

const main = async () => {
  const force = process.argv.includes("--force");

  const versions = await json(`${DDRAGON}/api/versions.json`);
  const latest = versions[0];
  const current = await bakedPatch();

  if (!force && current === latest) {
    console.log(`No new patch. Artifact is already on ${latest}.`);
    return;
  }
  console.log(`Patch ${current ?? "none"} -> ${latest}. Rebuilding.`);

  const { data } = await json(`${DDRAGON}/cdn/${latest}/data/en_US/champion.json`);
  const rows = Object.values(data)
    .map(toRow)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const problems = check(rows);
  if (problems.length) {
    console.error("Sanity checks failed, keeping the existing artifact:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  const template = await readFile(TEMPLATE, "utf8");
  const out = template
    .replace("__DATA__", JSON.stringify(rows))
    .replace("__PATCH__", latest);

  await writeFile(OUTPUT, out);
  console.log(`Wrote ${rows.length} champions at patch ${latest}.`);
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
