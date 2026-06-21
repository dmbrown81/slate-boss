import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const root = resolve(new URL('..', import.meta.url).pathname);
const outDir = resolve(root, 'public/icons');

const specs = [
  ['icon-192.png', 192, 0.74],
  ['apple-touch-icon.png', 180, 0.74],
  ['icon-512.png', 512, 0.74],
  ['maskable-icon-512.png', 512, 0.58],
];

const androidIconSpecs = [
  ['mipmap-mdpi', 48, 108],
  ['mipmap-hdpi', 72, 162],
  ['mipmap-xhdpi', 96, 216],
  ['mipmap-xxhdpi', 144, 324],
  ['mipmap-xxxhdpi', 192, 432],
];

const androidSplashSpecs = [
  ['drawable/splash.png', 480, 320],
  ['drawable-land-mdpi/splash.png', 480, 320],
  ['drawable-land-hdpi/splash.png', 800, 480],
  ['drawable-land-xhdpi/splash.png', 1280, 720],
  ['drawable-land-xxhdpi/splash.png', 1600, 960],
  ['drawable-land-xxxhdpi/splash.png', 1920, 1280],
  ['drawable-port-mdpi/splash.png', 320, 480],
  ['drawable-port-hdpi/splash.png', 480, 800],
  ['drawable-port-xhdpi/splash.png', 720, 1280],
  ['drawable-port-xxhdpi/splash.png', 960, 1600],
  ['drawable-port-xxxhdpi/splash.png', 1280, 1920],
];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function png(width, height, rgba, colorType = 6) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;

  const channels = colorType === 2 ? 3 : 4;
  const raw = Buffer.alloc((width * channels + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rawRow = y * (width * channels + 1);
    raw[rawRow] = 0;
    if (channels === 4) {
      rgba.copy(raw, rawRow + 1, y * width * 4, (y + 1) * width * 4);
    } else {
      for (let x = 0; x < width; x += 1) {
        const source = (y * width + x) * 4;
        const target = rawRow + 1 + x * 3;
        raw[target] = rgba[source];
        raw[target + 1] = rgba[source + 1];
        raw[target + 2] = rgba[source + 2];
      }
    }
  }

  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * clamp(t));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t);
}

function fillPixel(buf, index, color) {
  buf[index] = color[0];
  buf[index + 1] = color[1];
  buf[index + 2] = color[2];
  buf[index + 3] = color[3] ?? 255;
}

function shieldContains(x, y, scale) {
  const top = -0.66 * scale;
  const shoulder = -0.42 * scale;
  const bottom = 0.72 * scale;
  if (y < top || y > bottom) return false;
  const topHalf = 0.44 * scale;
  const bottomHalf = 0.06 * scale;
  const t = y < shoulder ? 0 : (y - shoulder) / (bottom - shoulder);
  const half = lerp(topHalf, bottomHalf, t);
  return Math.abs(x) <= half;
}

function rotatedEllipse(x, y, cx, cy, rx, ry, angle) {
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const dx = x - cx;
  const dy = y - cy;
  const px = dx * c + dy * s;
  const py = -dx * s + dy * c;
  return (px * px) / (rx * rx) + (py * py) / (ry * ry);
}

function gMarkContains(x, y, scale) {
  const gx = x / scale;
  const gy = (y - 0.03 * scale) / scale;
  const r = Math.hypot(gx, gy);
  const ring = r > 0.22 && r < 0.38 && !(gx > 0.08 && gy < -0.04);
  const crossbar = gx > -0.02 && gx < 0.34 && gy > -0.02 && gy < 0.09;
  const rightStem = gx > 0.26 && gx < 0.38 && gy > -0.02 && gy < 0.26;
  return ring || crossbar || rightStem;
}

function drawIcon(size, markScale, rgb = false) {
  const buf = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size * 2 - 1;
      const ny = (y + 0.5) / size * 2 - 1;
      const i = (y * size + x) * 4;

      const vignette = Math.min(1, Math.hypot(nx * 0.8, ny * 0.85));
      const topGlow = Math.max(0, 1 - Math.hypot(nx * 1.15, (ny + 0.88) * 1.4));
      const line = Math.abs((((y / size) * 8) % 1) - 0.5) < 0.012 ? 18 : 0;
      let color = [
        mix(15, 3, vignette) + Math.round(topGlow * 10),
        mix(40, 9, vignette) + Math.round(topGlow * 20) + line,
        mix(32, 15, vignette) + Math.round(topGlow * 8) + line,
        255,
      ];

      const scale = markScale;
      const shield = shieldContains(nx, ny, scale);
      const shieldBorder = shieldContains(nx, ny, scale * 1.07) && !shield;
      if (shieldBorder) color = [240, 180, 41, color[3]];
      if (shield) {
        const shine = Math.max(0, 1 - Math.hypot(nx * 2.2, (ny + 0.42) * 1.8));
        color = [
          5 + Math.round(shine * 18),
          14 + Math.round(shine * 22),
          22 + Math.round(shine * 20),
          color[3],
        ];
      }

      const softBall = rotatedEllipse(nx, ny, 0.03, -0.02, 0.4 * scale, 0.22 * scale, -0.55);
      if (shield && softBall <= 1) {
        color = [
          color[0] + Math.round((1 - softBall) * 12),
          color[1] + Math.round((1 - softBall) * 8),
          color[2],
          color[3],
        ];
      }

      if (shield && gMarkContains(nx, ny, scale)) color = [240, 180, 41, color[3]];

      fillPixel(buf, i, color);
    }
  }

  return png(size, size, buf, rgb ? 2 : 6);
}

function drawSplash(width, height, rgb = false) {
  const buf = Buffer.alloc(width * height * 4);
  const short = Math.min(width, height);
  const scale = Math.max(0.28, Math.min(0.46, 180 / short));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = (x + 0.5 - width / 2) / (short / 2);
      const ny = (y + 0.5 - height / 2) / (short / 2);
      const sx = (x + 0.5) / width * 2 - 1;
      const sy = (y + 0.5) / height * 2 - 1;
      const i = (y * width + x) * 4;

      const vignette = Math.min(1, Math.hypot(sx * 0.75, sy * 0.85));
      const topGlow = Math.max(0, 1 - Math.hypot(sx * 1.15, (sy + 0.88) * 1.4));
      const line = Math.abs((((y / short) * 8) % 1) - 0.5) < 0.01 ? 14 : 0;
      let color = [
        mix(14, 3, vignette) + Math.round(topGlow * 9),
        mix(35, 9, vignette) + Math.round(topGlow * 18) + line,
        mix(30, 15, vignette) + Math.round(topGlow * 7) + line,
        255,
      ];

      const shield = shieldContains(nx, ny, scale);
      const shieldBorder = shieldContains(nx, ny, scale * 1.07) && !shield;
      if (shieldBorder) color = [240, 180, 41, 255];
      if (shield) {
        const shine = Math.max(0, 1 - Math.hypot(nx * 2.2, (ny + 0.42) * 1.8));
        color = [
          5 + Math.round(shine * 18),
          14 + Math.round(shine * 22),
          22 + Math.round(shine * 20),
          255,
        ];
      }
      if (shield && gMarkContains(nx, ny, scale)) color = [240, 180, 41, 255];

      fillPixel(buf, i, color);
    }
  }

  return png(width, height, buf, rgb ? 2 : 6);
}

mkdirSync(outDir, { recursive: true });
for (const [name, size, scale] of specs) {
  const file = resolve(outDir, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, drawIcon(size, scale));
  console.log(`wrote ${file}`);
}

const iosIcon = resolve(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
mkdirSync(dirname(iosIcon), { recursive: true });
writeFileSync(iosIcon, drawIcon(1024, 0.74, true));
console.log(`wrote ${iosIcon}`);

for (const [dir, legacySize, foregroundSize] of androidIconSpecs) {
  const baseDir = resolve(root, `android/app/src/main/res/${dir}`);
  mkdirSync(baseDir, { recursive: true });
  writeFileSync(resolve(baseDir, 'ic_launcher.png'), drawIcon(legacySize, 0.72));
  writeFileSync(resolve(baseDir, 'ic_launcher_round.png'), drawIcon(legacySize, 0.72));
  writeFileSync(resolve(baseDir, 'ic_launcher_foreground.png'), drawIcon(foregroundSize, 0.46));
  console.log(`wrote ${baseDir}/ic_launcher*.png`);
}

const iosSplashDir = resolve(root, 'ios/App/App/Assets.xcassets/Splash.imageset');
mkdirSync(iosSplashDir, { recursive: true });
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  const file = resolve(iosSplashDir, name);
  writeFileSync(file, drawSplash(2732, 2732, true));
  console.log(`wrote ${file}`);
}

for (const [relativePath, width, height] of androidSplashSpecs) {
  const file = resolve(root, `android/app/src/main/res/${relativePath}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, drawSplash(width, height));
  console.log(`wrote ${file}`);
}
