const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");

test("mobile station views reduce top spacing without changing settings spacing", () => {
  assert.match(
    styles,
    /\.main-content\s*\{[\s\S]*?margin: 56px auto 0;/
  );
  assert.match(
    styles,
    /@media \(max-width: 760px\)\s*\{[\s\S]*?\.main-content:not\(\.is-settings-view\)\s*\{[\s\S]*?margin-top: 0;/
  );
  assert.match(
    styles,
    /\.main-content\.is-settings-view\s*\{[\s\S]*?align-self: stretch;/
  );
});

test("mobile app padding continues to include the top safe area", () => {
  assert.match(
    styles,
    /@media \(max-width: 480px\) and \(orientation: portrait\)[\s\S]*?calc\(8px \+ env\(safe-area-inset-top\)\)/
  );
  assert.match(
    styles,
    /@media \(max-height: 500px\) and \(orientation: landscape\)[\s\S]*?calc\(7px \+ env\(safe-area-inset-top\)\)/
  );
});
