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
const CDRAGON = "https://raw.communitydragon.org";

/* How many CommunityDragon character files to have in flight at once. The
   repair only runs on a broken patch and only fetches what it must, but that
   is still one sizable file per champion — be a polite client. */
const CDRAGON_CONCURRENCY = 8;

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

/** "16.17.1" -> "16.17". CommunityDragon pins by major.minor only. */
const cdragonPatch = (v) => v.split(".").slice(0, 2).join(".");

/**
 * Pull one champion's AD growth out of a CommunityDragon character record.
 *
 * Base AD is used as a fingerprint rather than trusting the key alone: a
 * character file can hold several records (pets, alternate forms), and
 * matching on a value both sources already agree about proves we are reading
 * the right champion on the right patch before taking a number from it.
 */
function adGrowthFrom(bin, id, baseAd) {
  const direct = bin[`Characters/${id}/CharacterRecords/Root`];
  const records = (direct ? [direct] : Object.values(bin)).filter(
    (v) => v && typeof v === "object" && typeof v.baseDamageModifiable === "object"
  );

  const match = records.find((r) => r.baseDamageModifiable?.baseValue === baseAd);
  if (!match) return null; // wrong or missing record — a genuine lookup failure

  // Riot's bin format omits any field that holds its default value, so an
  // absent damagePerLevelModifiable means 0, not a failure. Senna is the real
  // case: she gains no AD per level by design (her passive's souls do it
  // instead), and her record carries no growth field at all. Treating that as
  // unresolved would flag a correct 0 as missing data.
  const growth = match.damagePerLevelModifiable?.baseValue ?? 0;
  return Number.isFinite(growth) ? growth : null;
}

/**
 * Data Dragon has been exporting attackdamageperlevel as 0 for the whole
 * roster since somewhere in the 16.x line. CommunityDragon publishes the raw
 * game files, which carry the real number and agree with Data Dragon on every
 * other stat, so we repair just this one field from there.
 *
 * Never fatal: a champion we cannot resolve keeps its 0 and is reported. A
 * partial roster is worth shipping — the artifact says which values are
 * missing — where failing the build would ship nothing at all.
 */
async function repairAdGrowth(champs, patch) {
  const tag = cdragonPatch(patch);
  console.log(`attackdamageperlevel is 0 across the roster — repairing from CommunityDragon (${tag}).`);

  const queue = champs.slice();
  const unresolved = [];
  let repaired = 0;

  const worker = async () => {
    for (let c = queue.pop(); c; c = queue.pop()) {
      const key = c.id.toLowerCase();
      try {
        const bin = await json(`${CDRAGON}/${tag}/game/data/characters/${key}/${key}.bin.json`);
        const growth = adGrowthFrom(bin, c.id, c.stats.attackdamage);
        if (growth === null) {
          unresolved.push(c.name);
        } else {
          c.stats.attackdamageperlevel = growth;
          repaired++;
        }
      } catch {
        unresolved.push(c.name);
      }
    }
  };

  await Promise.all(Array.from({ length: CDRAGON_CONCURRENCY }, worker));

  console.log(`Repaired ${repaired} of ${champs.length} champions.`);
  if (unresolved.length) {
    // Capped: a total outage lists the entire roster otherwise, which buries
    // the one line that matters in the job log.
    const shown = unresolved.sort().slice(0, 12);
    const rest = unresolved.length - shown.length;
    console.warn(
      `Warning: no AD growth found for ${unresolved.length}: ${shown.join(", ")}` +
        (rest ? `, and ${rest} more` : "")
    );
  }
  return { repaired, unresolved };
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

  // Whatever the CommunityDragon repair could not fill in stays at 0. The
  // templates detect the same condition and print a callout naming it, so this
  // is never silent — warn and build, rather than freezing the artifact on an
  // old patch for as long as Riot's export stays bad.
  // Only a roster-wide zero is a fault. Individual zeros are legitimate —
  // Senna is designed with no AD growth — so they are not worth a warning;
  // repairAdGrowth reports the champions it genuinely could not resolve.
  if (rows.every((r) => !r[6])) {
    warnings.push("attackdamageperlevel is 0 for every champion — upstream data fault, unrepaired");
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
  const champs = Object.values(data);

  // Data Dragon stays the source of truth; CommunityDragon is consulted only
  // to repair the one field Riot's export is currently zeroing out.
  let adSource = "";
  let adMissing = [];
  if (champs.length && champs.every((c) => !c.stats.attackdamageperlevel)) {
    const { repaired, unresolved } = await repairAdGrowth(champs, latest);
    if (repaired) adSource = `CommunityDragon ${cdragonPatch(latest)}`;
    adMissing = unresolved.sort();
  }

  const rows = champs.map(toRow).sort((a, b) => a[0].localeCompare(b[0]));

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
      .replace("__PATCH__", latest)
      .replace("__AD_SOURCE__", adSource)
      .replace("__AD_MISSING__", JSON.stringify(adMissing));
    await writeFile(output, out);
  }
  console.log(`Wrote ${rows.length} champions at patch ${latest}.`);
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
