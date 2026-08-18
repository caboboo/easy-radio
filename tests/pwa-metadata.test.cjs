const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const manifest = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "site.webmanifest"), "utf8")
);
const iconDirectory = path.join(projectRoot, "icons");

const pngExpectations = new Map([
  ["apple-touch-icon.png", [180, 180]],
  ["icon-192.png", [192, 192]],
  ["icon-512.png", [512, 512]],
  ["favicon-32.png", [32, 32]],
  ["favicon-16.png", [16, 16]]
]);

function readPngDimensions(filePath) {
  const data = fs.readFileSync(filePath);
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  assert.ok(data.subarray(0, 8).equals(pngSignature));
  assert.equal(data.toString("ascii", 12, 16), "IHDR");

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    bitDepth: data[24],
    colorType: data[25],
    bytes: data.length
  };
}

function relativeLuminance(hexColor) {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/g)
    .map(channel => parseInt(channel, 16) / 255)
    .map(value =>
      value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4
    );

  return (
    0.2126 * channels[0] +
    0.7152 * channels[1] +
    0.0722 * channels[2]
  );
}

function contrastRatio(background, foreground) {
  const luminances = [
    relativeLuminance(background),
    relativeLuminance(foreground)
  ].sort((left, right) => right - left);

  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

test("all required raster icons have exact dimensions and compact RGB PNGs", () => {
  for (const [fileName, [expectedWidth, expectedHeight]] of pngExpectations) {
    const details = readPngDimensions(path.join(iconDirectory, fileName));

    assert.equal(details.width, expectedWidth, fileName);
    assert.equal(details.height, expectedHeight, fileName);
    assert.equal(details.bitDepth, 8, fileName);
    assert.equal(details.colorType, 2, fileName);
    assert.ok(details.bytes < 100_000, fileName);
  }
});

test("favicon.ico contains valid 16px and 32px PNG entries", () => {
  const ico = fs.readFileSync(path.join(iconDirectory, "favicon.ico"));

  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 2);

  const sizes = [];
  for (let index = 0; index < 2; index += 1) {
    const entryOffset = 6 + index * 16;
    const width = ico[entryOffset] || 256;
    const height = ico[entryOffset + 1] || 256;
    const byteLength = ico.readUInt32LE(entryOffset + 8);
    const imageOffset = ico.readUInt32LE(entryOffset + 12);
    const image = ico.subarray(imageOffset, imageOffset + byteLength);

    sizes.push(width + "x" + height);
    assert.ok(
      image.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      )
    );
  }

  assert.deepEqual(sizes, ["16x16", "32x32"]);
});

test("the SVG master preserves the exact two-line brand design", () => {
  const svg = fs.readFileSync(
    path.join(iconDirectory, "icon-master.svg"),
    "utf8"
  );

  assert.match(svg, /width="1024" height="1024"/);
  assert.match(svg, /fill="#552807"/);
  assert.match(svg, /fill="#FFFDF7"/);
  assert.match(svg, /font-size="286" font-weight="600"/);
  assert.match(svg, /font-size="330" font-weight="700"/);
  assert.match(svg, /y="460"[^>]*>easy<\/text>/);
  assert.match(svg, /y="685"[^>]*>radio<\/text>/);
  assert.ok(330 / 286 >= 1.1 && 330 / 286 <= 1.2);
  assert.ok(286 / 248 >= 1.15);
  assert.ok(330 / 286 >= 1.15);
  assert.ok(685 - 460 < 704 - 456);
  assert.ok(
    contrastRatio("#552807", "#FFFDF7") >
      contrastRatio("#4A2B12", "#FFF8EB")
  );
  assert.match(svg, />easy<\/text>/);
  assert.match(svg, />radio<\/text>/);
  assert.doesNotMatch(svg, /linearGradient|filter|rx=/);
});

test("index.html contains one complete set of install metadata", () => {
  const expectations = [
    /<meta name="theme-color" content="#4a2b12">/,
    /<meta name="apple-mobile-web-app-capable" content="yes">/,
    /<meta name="apple-mobile-web-app-status-bar-style" content="default">/,
    /<meta name="apple-mobile-web-app-title" content="Easy Radio">/,
    /<link rel="icon" type="image\/x-icon" href="icons\/favicon\.ico">/,
    /<link rel="icon" type="image\/png" sizes="32x32" href="icons\/favicon-32\.png">/,
    /<link rel="icon" type="image\/png" sizes="16x16" href="icons\/favicon-16\.png">/,
    /<link rel="apple-touch-icon" sizes="180x180" href="icons\/apple-touch-icon\.png">/,
    /<link rel="manifest" href="site\.webmanifest">/
  ];

  for (const expectation of expectations) {
    assert.equal((html.match(expectation) || []).length, 1);
  }

  assert.match(
    html,
    /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/
  );
  assert.doesNotMatch(html, /apple-touch-icon-precomposed/);
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
});

test("manifest stays inside the GitHub Pages project path", () => {
  assert.equal(manifest.name, "Easy Radio");
  assert.equal(manifest.short_name, "Easy Radio");
  assert.equal(manifest.start_url, "/easy-radio/");
  assert.equal(manifest.scope, "/easy-radio/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.background_color, "#4a2b12");
  assert.equal(manifest.theme_color, "#4a2b12");
  assert.deepEqual(manifest.icons, [
    {
      src: "icons/icon-192.png",
      sizes: "192x192",
      type: "image/png"
    },
    {
      src: "icons/icon-512.png",
      sizes: "512x512",
      type: "image/png"
    }
  ]);
});

test("the project does not register a service worker", () => {
  const scripts = [
    "script.js",
    "station-menu.js",
    "station-sort.js",
    "station-search.js"
  ].map(fileName =>
    fs.readFileSync(path.join(projectRoot, fileName), "utf8")
  ).join("\n");

  assert.doesNotMatch(html, /serviceworker|service-worker/i);
  assert.doesNotMatch(scripts, /serviceWorker\.register|navigator\.serviceWorker/);
});