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
const ROOT = resolve(HERE, "..");
const DDRAGON = "https://ddragon.leagueoflegends.com";

/* Two renderings of the same data. The .html one is what gets published as the
   Rift Base Stats artifact; the .jsx one predates it and is kept in step. Both
   templates take the same __DATA__ / __PATCH__ placeholders. Templates live at
   the repo root, so they resolve against ROOT rather than this scripts/ dir. */
const TARGETS = [
  { template: resolve(ROOT, "artifact.template.html"), output: resolve(ROOT, "rift-base-stats.html") },
  { template: resolve(ROOT, "artifact.template.jsx"), output: resolve(HERE, "rift-roster-artifact.jsx") },
];

/** The patch baked into the artifact is read from the html build. */
const OUTPUT = TARGETS[0].output;

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

/**
 * Fatal `problems` mean we parsed the response wrong and cannot trust any of
 * it. Non-fatal `warnings` mean Riot's own export is off: the numbers are a
 * faithful copy of what they shipped, so building is still the right call as
 * long as the artifact says so.
 */
function check(rows) {
  const problems = [];
  const warnings = [];

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
  // roster — a Riot data fault, not a parsing one. This used to be fatal,
  // because flattening AD scaling across the artifact silently was worse than
  // shipping nothing. The templates now detect the same condition and print a
  // callout naming it, so it is no longer silent: warn and build, rather than
  // freezing the artifact on an old patch for as long as Riot's export is bad.
  if (rows.every((r) => !r[6])) {
    warnings.push("attackdamageperlevel is 0 for every champion — upstream data fault");
  }

  return { problems, warnings };
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

  const { problems, warnings } = check(rows);
  for (const w of warnings) console.warn(`Warning: ${w}`);
  if (problems.length) {
    console.error("Sanity checks failed, keeping the existing artifact:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  const serialized = JSON.stringify(rows);
  for (const { template, output } of TARGETS) {
    const out = (await readFile(template, "utf8"))
      .replace("__DATA__", serialized)
      .replace("__PATCH__", latest);
    await writeFile(output, out);
  }
  console.log(`Wrote ${rows.length} champions at patch ${latest}.`);
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
