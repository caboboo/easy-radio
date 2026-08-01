const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const script = fs.readFileSync(path.join(projectRoot, "script.js"), "utf8");
const styles = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");

test("floating controls contain seven inaccessible decorative bars", () => {
  const decoration = html.match(
    /<div class="playback-activity-bars" aria-hidden="true">([\s\S]*?)<\/div>/
  );

  assert.ok(decoration, "playback activity decoration must exist");
  assert.equal(
    (decoration[1].match(/class="playback-activity-bar"/g) || []).length,
    7
  );
  assert.doesNotMatch(decoration[0], /tabindex=/);
  assert.equal((html.match(/id="playButton"/g) || []).length, 1);
  assert.equal((html.match(/id="volumeSlider"/g) || []).length, 1);
  assert.equal((html.match(/id="muteButton"/g) || []).length, 1);
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
});

test("activity class follows only the existing PLAYING UI state", () => {
  assert.match(
    script,
    /const isPlaying = playbackState === PlaybackState\.PLAYING;/
  );
  assert.match(
    script,
    /playbackControls\.classList\.toggle\("is-playing", isPlaying\);/
  );
  assert.equal((script.match(/playbackControls/g) || []).length, 2);
  assert.doesNotMatch(
    script,
    /AudioContext|webkitAudioContext|AnalyserNode|createAnalyser|createMediaElementSource|requestAnimationFrame/
  );
  assert.doesNotMatch(html, /<canvas\b/i);
});

test("CSS animation is subtle, click-through, and behind the controls", () => {
  assert.match(
    styles,
    /\.playback-activity-bars\s*\{[\s\S]*?position: absolute;[\s\S]*?z-index: 0;[\s\S]*?opacity: 0;[\s\S]*?pointer-events: none;/
  );
  assert.match(
    styles,
    /\.floating-playback-bar > :not\(\.playback-activity-bars\)\s*\{[\s\S]*?z-index: 1;/
  );
  assert.match(
    styles,
    /\.floating-playback-bar\.is-playing \.playback-activity-bars\s*\{[\s\S]*?opacity: 0\.15;/
  );
  assert.match(
    styles,
    /\.floating-playback-bar\.is-playing \.playback-activity-bar\s*\{[\s\S]*?animation-play-state: running;/
  );
  assert.match(styles, /height: 30%;/);
  assert.match(styles, /animation-duration: 1\.35s;/);
  assert.match(styles, /animation-duration: 1\.9s;/);
});

test("reduced motion keeps the indicator static", () => {
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.playback-activity-bar\s*\{[\s\S]*?animation: none;[\s\S]*?transform: scaleY\(0\.55\);/
  );
});