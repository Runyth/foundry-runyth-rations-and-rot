import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

function read(relative) {
  return readFileSync(resolve(root, relative), "utf8");
}

test("dashboard header uses a bounded control grid instead of a clipping action row", () => {
  const template = read("templates/dashboard.hbs");
  const css = read("styles/runyth-rations-and-rot.css");

  assert.match(template, /rnr-dashboard-header/);
  assert.match(template, /rnr-dashboard-controls/);
  assert.match(template, /rnr-dashboard-actions/);
  assert.match(template, /data-action="refresh"/);
  assert.match(template, /data-action="scan"/);
  assert.doesNotMatch(template, /rnr-toolbar-actions/);

  assert.match(css, /\.rations-and-rot,\s*\.rations-and-rot \*,[\s\S]*box-sizing:\s*border-box/);
  assert.match(css, /\.rnr-dashboard-controls\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) max-content/);
  assert.match(css, /@container rnr-dashboard \(max-width:\s*42rem\)/);
  assert.match(css, /\.rnr-dashboard-actions\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit/);
});

test("dashboard uses uniform Actor cards with isolated metrics and action zones", () => {
  const template = read("templates/dashboard.hbs");
  const css = read("styles/runyth-rations-and-rot.css");

  assert.match(template, /rnr-actor-grid/);
  assert.match(template, /rnr-card-total/);
  assert.match(template, /rnr-card-status-grid/);
  assert.match(template, /rnr-actor-card-actions/);
  assert.match(template, /data-action="manageActor"/);
  assert.doesNotMatch(template, /data-rnr-item-row/);
  assert.doesNotMatch(template, /<table/);

  assert.match(css, /grid-auto-rows:\s*18rem/);
  assert.match(css, /grid-template-rows:\s*4\.65rem minmax\(0, 1fr\) 3\.55rem/);
  assert.match(css, /\.rnr-actor-card-body\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.rnr-card-status-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.rnr-actor-card-actions\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--rnr-control-height\)/);
});

test("Actor inventory manager exposes stable bulk enrollment and custom spoilable actions", () => {
  const template = read("templates/actor-inventory.hbs");
  assert.match(template, /data-rnr-track-select/);
  assert.match(template, /data-rnr-select-all/);
  assert.match(template, /data-action="trackSelected"/);
  assert.match(template, /data-action="createCustom"/);
  assert.match(template, /data-action="trackItem"/);
});

test("Actor\/folder picker is scrollable, hierarchical, searchable, and multi-selectable", () => {
  const template = read("templates/actor-scope-picker.hbs");
  const css = read("styles/runyth-rations-and-rot.css");
  assert.match(template, /role="tree"/);
  assert.match(template, /name="folderIds"/);
  assert.match(template, /name="actorIds"/);
  assert.match(template, /data-rnr-picker-search/);
  assert.match(css, /rnr-picker-list[\s\S]*overflow:\s*auto/);
  assert.match(css, /var\(--rnr-depth\)/);
});
