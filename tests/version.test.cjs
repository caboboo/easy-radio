const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.join(__dirname, "..");

test("version.js exposes the current Version and Build Number", () => {
  const source = fs.readFileSync(
    path.join(projectRoot, "version.js"),
    "utf8"
  );
  const context = { window: {} };

  vm.runInNewContext(source, context);

  const releaseInfo = context.window.EASY_RADIO_VERSION;

  assert.match(releaseInfo.version, /^v\d+\.\d+$/);
  assert.equal(releaseInfo.version, "v0.3");
  assert.equal(releaseInfo.build, 36);
  assert.ok(Number.isInteger(releaseInfo.build));
  assert.ok(releaseInfo.build >= 1);
  assert.ok(Object.isFrozen(releaseInfo));
});

test("the page displays Version and Build separately", () => {
  const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(projectRoot, "script.js"), "utf8");

  assert.match(html, /id="versionText"><\/span>/);
  assert.match(html, /id="buildText"><\/span>/);
  const settingsView =
    html.match(/<section[\s\S]*?id="settingsView"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(settingsView, /id="versionText"/);
  assert.match(settingsView, /id="buildText"/);
  assert.doesNotMatch(html, /<footer class="footer">/);
  assert.match(script, /`Version \$\{version\}`/);
  assert.match(script, /`Build \$\{String\(build\)\.padStart\(3, "0"\)\}`/);
  assert.ok(
    html.indexOf('src="version.js"') < html.indexOf('src="script.js"'),
    "version.js must load before script.js"
  );
  assert.doesNotMatch(html, /v0\.3\.\d+/);
});
