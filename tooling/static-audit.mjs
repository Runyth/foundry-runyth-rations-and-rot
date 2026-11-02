import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const manifestPath = path.join(root, "module.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function exists(relativePath) {
  try {
    await stat(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(directory, predicate) {
  const output = [];
  const base = path.join(root, directory);
  for (const entry of await readdir(base, { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...await collectFiles(relative, predicate));
    } else if (predicate(relative)) {
      output.push(relative);
    }
  }
  return output;
}

assert(manifest.id === "rations-and-rot", "Manifest id must remain rations-and-rot.");
assert(manifest.version === "1.0.2", "Manifest version must be 1.0.2.");
assert(manifest.compatibility?.minimum === "13", "Minimum Foundry compatibility must be v13.");
assert(manifest.compatibility?.maximum === "13", "Maximum Foundry compatibility must remain v13 for this release.");

for (const relative of [...(manifest.esmodules ?? []), ...(manifest.styles ?? [])]) {
  assert(await exists(relative), `Manifest runtime path does not exist: ${relative}`);
}
for (const language of manifest.languages ?? []) {
  assert(await exists(language.path), `Manifest language path does not exist: ${language.path}`);
}

const runtimeFiles = [
  ...(await collectFiles("scripts", (file) => file.endsWith(".mjs"))),
  ...(await collectFiles("templates", (file) => file.endsWith(".hbs"))),
  ...(await collectFiles("styles", (file) => file.endsWith(".css")))
];

const forbiddenPatterns = [
  { regex: /\bnew\s+Dialog\s*\(/u, label: "legacy new Dialog constructor" },
  { regex: /\bFormApplication\b/u, label: "legacy FormApplication" },
  { regex: /\bFilePicker\s*\./u, label: "deprecated global FilePicker access" },
  { regex: /\bmergeObject\s*\(/u, label: "legacy mergeObject helper" },
  { regex: /\brenderTemplate\s*\(/u, label: "legacy renderTemplate helper" },
  { regex: /\bsetInterval\s*\(/u, label: "runtime polling via setInterval" }
];

for (const relative of runtimeFiles) {
  const text = await readFile(path.join(root, relative), "utf8");
  for (const { regex, label } of forbiddenPatterns) {
    if (regex.test(text)) failures.push(`${relative}: contains ${label}.`);
  }
}

const dashboardTemplate = await readFile(path.join(root, "templates/dashboard.hbs"), "utf8");
const dashboardCss = await readFile(path.join(root, "styles/rations-and-rot.css"), "utf8");
assert(dashboardTemplate.includes("rnr-dashboard-controls"), "Dashboard must use the bounded control grid.");
assert(dashboardTemplate.includes("rnr-dashboard-actions"), "Dashboard actions must be isolated from the search field.");
assert(!dashboardTemplate.includes("rnr-toolbar-actions"), "Dashboard must not use the legacy non-wrapping toolbar action row.");
assert(dashboardTemplate.includes("rnr-actor-grid"), "Dashboard must use the stable actor-card grid.");
assert(dashboardTemplate.includes("rnr-card-status-grid"), "Actor cards must use the equal status grid.");
assert(dashboardTemplate.includes('data-action="manageActor"'), "Actor cards must expose a stable manage action.");
assert(!dashboardTemplate.includes("rnr-item-table"), "Main dashboard must not embed variable-height inventory tables.");
assert(/grid-auto-rows:\s*18rem/u.test(dashboardCss), "Actor cards must use the release's normalized fixed grid row height.");
assert(/grid-template-rows:\s*4\.65rem minmax\(0, 1fr\) 3\.55rem/u.test(dashboardCss), "Actor cards must isolate header, body, and footer rows.");
assert(/@container rnr-dashboard \(max-width:\s*42rem\)/u.test(dashboardCss), "Dashboard controls must respond to Application content width.");
assert(/box-sizing:\s*border-box/u.test(dashboardCss), "Module UI must use border-box sizing containment.");

const inventoryTemplate = await readFile(path.join(root, "templates/actor-inventory.hbs"), "utf8");
assert(inventoryTemplate.includes('data-action="trackSelected"'), "Inventory manager must expose bulk tracking.");
assert(inventoryTemplate.includes('data-action="createCustom"'), "Inventory manager must expose custom spoilable creation.");

const pickerTemplate = await readFile(path.join(root, "templates/actor-scope-picker.hbs"), "utf8");
assert(pickerTemplate.includes('role="tree"'), "Actor scope picker must expose hierarchical tree semantics.");
assert(pickerTemplate.includes('name="folderIds"'), "Actor scope picker must support folder selection.");
assert(pickerTemplate.includes('name="actorIds"'), "Actor scope picker must support explicit Actor selection.");

if (failures.length) {
  console.error("Static audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Static Foundry v13 audit passed: ${runtimeFiles.length} runtime/template/style files.`);
}
