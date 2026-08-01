const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const script = fs.readFileSync(path.join(projectRoot, "script.js"), "utf8");
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");

test("play and replay actions use the green base button", () => {
  assert.match(html, /id="playText">播放<\/span>/);
  assert.match(
    styles,
    /\.play-button\s*\{[\s\S]*?border-bottom: 5px solid #14521c;[\s\S]*?background: linear-gradient\(#348f40, #21762b\);/
  );
  assert.match(script, /shouldOfferReplay[\s\S]*?\? "重新播放"/);
});

test("pause or cancel actions apply the red stop-action class", () => {
  assert.match(
    script,
    /playButton\.classList\.toggle\("is-stop-action", canCancelPlayback\)/
  );
  assert.match(script, /playIcon\.textContent = canCancelPlayback \? "Ⅱ" : "▶"/);
  assert.match(script, /canCancelPlayback[\s\S]*?\? "暫停播放"/);
  assert.match(
    styles,
    /\.play-button\.is-stop-action\s*\{[\s\S]*?background: linear-gradient\(#f04435, #d71f16\);[\s\S]*?border-bottom-color: #95180f;/
  );
  assert.doesNotMatch(script, /classList\.toggle\("is-playing"/);
  assert.doesNotMatch(styles, /\.play-button\.is-playing/);
});

test("play button geometry and elevation stay unchanged", () => {
  assert.match(
    styles,
    /\.play-button\s*\{[\s\S]*?width: 100%;[\s\S]*?min-height: 64px;[\s\S]*?border-radius: 16px;[\s\S]*?box-shadow: 0 5px 14px rgba\(158, 23, 16, 0\.3\);/
  );
  assert.equal((html.match(/id="playButton"/g) || []).length, 1);
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
});
