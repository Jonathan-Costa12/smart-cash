import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// bg/fg = [r,g,b] ou [r,g,b,a]. Se fg tiver alpha 0 fora do círculo, gera PNG com canal alpha (RGBA).
function makeCirclePng(size, bg, fg, { transparentBg = false, radiusRatio = 0.38 } = {}) {
  const hasAlpha = transparentBg;
  const channels = hasAlpha ? 4 : 3;
  const colorType = hasAlpha ? 6 : 2;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const center = size / 2;
  const radius = size * radiusRatio;

  const rowLen = size * channels + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLen;
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const inCircle = dx * dx + dy * dy <= radius * radius;
      const px = rowStart + 1 + x * channels;
      if (inCircle) {
        raw[px] = fg[0];
        raw[px + 1] = fg[1];
        raw[px + 2] = fg[2];
        if (hasAlpha) raw[px + 3] = 255;
      } else {
        raw[px] = bg[0];
        raw[px + 1] = bg[1];
        raw[px + 2] = bg[2];
        if (hasAlpha) raw[px + 3] = transparentBg ? 0 : 255;
      }
    }
  }
  const idat = deflateSync(raw);

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const black = [0, 0, 0];
const green = [22, 163, 74]; // Tailwind green-600

mkdirSync(new URL('../assets', import.meta.url), { recursive: true });

// Ícone principal (fundo preto sólido, sem transparência)
writeFileSync(new URL('../assets/icon-only.png', import.meta.url), makeCirclePng(1024, black, green));

// Ícone adaptativo Android: fundo sólido + primeiro plano com alpha
writeFileSync(new URL('../assets/icon-background.png', import.meta.url), makeCirclePng(1024, black, black));
writeFileSync(
  new URL('../assets/icon-foreground.png', import.meta.url),
  makeCirclePng(1024, [0, 0, 0], green, { transparentBg: true, radiusRatio: 0.3 })
);

// Splash screen
writeFileSync(new URL('../assets/splash.png', import.meta.url), makeCirclePng(2732, black, green, { radiusRatio: 0.16 }));
writeFileSync(new URL('../assets/splash-dark.png', import.meta.url), makeCirclePng(2732, black, green, { radiusRatio: 0.16 }));

console.log('Assets do Capacitor gerados em client/assets/');
