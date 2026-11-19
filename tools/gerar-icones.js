// Gera os ícones PNG do app (Tela de Início do iPhone/Android) sem dependências.
// Uso: node tools/gerar-icones.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [0x17, 0x14, 0x2b];   // grafite violeta (fundo)
const LIME = [0xc8, 0xf2, 0x5a]; // marca
const INK = [0x17, 0x14, 0x2b];

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba){
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
// Desenha em coordenadas 0..1: fundo escuro em tudo, quadrado lima central e o "V" caligráfico
// (mesmo desenho do index.html: traço da esquerda cheio, o da direita com 50% de opacidade).
const ARM1 = [[4.4, 5.6], [9.1, 5.6], [13.7, 18.7], [10.8, 18.7]];
const ARM2 = [[15.1, 5.6], [19.6, 5.6], [13.6, 18.7], [11.0, 18.7]];
const inPoly = (x, y, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const MIX = LIME.map((c, i) => Math.round((c + INK[i]) / 2));
function sample(u, v, { mark = 0.62 }){
  const m0 = (1 - mark) / 2, m1 = 1 - m0;
  if (!inRoundRect(u, v, m0, m0, m1, m1, mark * 0.3)) return BG;
  const gx = (u - m0) / mark * 24, gy = (v - m0) / mark * 24;
  if (inPoly(gx, gy, ARM1)) return INK;
  if (inPoly(gx, gy, ARM2)) return MIX;
  return LIME;
}
function render(size, opts){
  const ss = 4, buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0;
    for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) {
      const c = sample((x + (i + 0.5) / ss) / size, (y + (j + 0.5) / ss) / size, opts);
      r += c[0]; g += c[1]; b += c[2];
    }
    const o = (y * size + x) * 4, n = ss * ss;
    buf[o] = Math.round(r / n); buf[o + 1] = Math.round(g / n); buf[o + 2] = Math.round(b / n); buf[o + 3] = 255;
  }
  return png(size, buf);
}
const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon-192.png'), render(192, { mark: 0.62 }));
fs.writeFileSync(path.join(out, 'icon-512.png'), render(512, { mark: 0.62 }));
fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), render(512, { mark: 0.5 })); // margem para o recorte do Android
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), render(180, { mark: 0.62 }));
console.log('ícones gerados em', out);
