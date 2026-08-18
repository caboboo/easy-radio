const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");

test("mobile views share reduced top spacing without changing settings layout", () => {
  assert.match(
    styles,
    /\.main-content\s*\{[\s\S]*?--mobile-top-spacing-offset: 56px;[\s\S]*?margin: 56px auto 0;/
  );
  assert.match(
    styles,
    /@media \(max-width: 760px\)\s*\{[\s\S]*?\.main-content\s*\{[\s\S]*?margin-top: 0;[\s\S]*?\.main-content\.is-settings-view\s*\{[\s\S]*?margin-bottom: var\(--mobile-top-spacing-offset\);/
  );
  assert.match(
    styles,
    /\.main-content\.is-settings-view\s*\{[\s\S]*?align-self: stretch;/
  );
});

test("mobile app padding continues to include the top safe area", () => {
  assert.match(
    styles,
    /@media \(max-width: 480px\) and \(orientation: portrait\)[\s\S]*?calc\(8px \+ env\(safe-area-inset-top\)\)[\s\S]*?--mobile-top-spacing-offset: 52px;[\s\S]*?margin-top: 52px;/
  );
  assert.match(
    styles,
    /@media \(max-height: 500px\) and \(orientation: landscape\)[\s\S]*?calc\(7px \+ env\(safe-area-inset-top\)\)[\s\S]*?--mobile-top-spacing-offset: 48px;[\s\S]*?margin-top: 48px;/
  );
});
