import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const RAW_DIR = path.join(process.cwd(), "raw");
const OUT_DIR = process.env.OUT_DIR || path.join(process.cwd(), "public", "assets");

// 1. Extrai a Logo do Dragão sem fundo branco + cria o Mapa de Brilho da Chama separado
async function processLogoAndFire(inputPath) {
  console.log("🐉 Extraindo Brasão do Dragão (Alpha) + Camada de Fogo separada...");
  const { data, info } = await sharp(inputPath)
    .resize(1100, 1100, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const logoPixels = new Uint8Array(data);
  const firePixels = new Uint8Array(data.length);

  for (let i = 0; i < logoPixels.length; i += 4) {
    const r = logoPixels[i];
    const g = logoPixels[i + 1];
    const b = logoPixels[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const bright = (r + g + b) / 3;

    // Remove o branco puro e suaviza a borda da fumaça laranja
    if (bright > 238 && sat < 0.14) {
      logoPixels[i + 3] = 0;
    } else if (bright > 185 && sat < 0.38) {
      const factor = Math.max(0, Math.min(1, (242 - bright) / 57));
      logoPixels[i + 3] = Math.round(factor * 255);
      logoPixels[i] = Math.min(255, Math.round(r * 1.08));
      logoPixels[i + 1] = Math.round(g * 0.72);
      logoPixels[i + 2] = Math.round(b * 0.25);
    }

    // Extrai apenas os tons quentes (fogo/ouro) para a camada de luz dinâmica
    const isWarm = r > 140 && r > g * 1.25 && g > b;
    if (isWarm && logoPixels[i + 3] > 20) {
      firePixels[i] = r;
      firePixels[i + 1] = g;
      firePixels[i + 2] = b;
      firePixels[i + 3] = Math.min(255, Math.round((r - b) * 1.1));
    } else {
      firePixels[i + 3] = 0;
    }
  }

  const logoBuf = await sharp(logoPixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 95 })
    .toBuffer();
  await fs.writeFile(path.join(OUT_DIR, "logo-thorin.webp"), logoBuf);

  const fireBuf = await sharp(firePixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .blur(12)
    .webp({ quality: 85, alphaQuality: 85 })
    .toBuffer();
  await fs.writeFile(path.join(OUT_DIR, "dragon-fire-glow.webp"), fireBuf);

  console.log("✅ logo-thorin.webp e dragon-fire-glow.webp criados!");
}

// 2. Processa o Avatar do Daniel com Recorte de Silhueta Preciso + De-spill de Borda (Remove 100% do Dragão/Texto do fundo)
async function processHeroPortrait(inputPath) {
  console.log("🔥 Extraindo apenas o tatuador Daniel Bourscheid (sem o dragão de fundo)...");
  const width = 1080;
  const height = 1080;

  // Silhueta anatômica precisa do Daniel nas coordenadas exatas 1080x1080
  const silhouetteMask = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="edgeFeather" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="1" />
          <stop offset="90%" stop-color="white" stop-opacity="1" />
          <stop offset="98%" stop-color="white" stop-opacity="0.4" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </linearGradient>
        <mask id="fadeMask">
          <rect width="${width}" height="${height}" fill="url(#bottomFade)" />
        </mask>
      </defs>
      <g mask="url(#fadeMask)">
        <path
          filter="url(#edgeFeather)"
          fill="white"
          d="
            M 535 300
            C 492 302, 464 334, 454 380
            C 450 402, 450 418, 450 428
            C 441 430, 440 450, 444 474
            C 447 488, 450 498, 454 508
            C 464 532, 472 560, 466 590
            C 438 612, 396 636, 355 662
            C 318 686, 294 716, 278 754
            C 264 786, 254 818, 248 855
            C 245 895, 246 942, 256 992
            C 264 1030, 274 1058, 284 1080
            L 782 1080
            C 796 1052, 812 1010, 823 960
            C 833 912, 836 864, 832 825
            C 826 785, 812 742, 792 702
            C 774 668, 742 648, 704 632
            C 666 616, 636 596, 614 572
            C 618 552, 623 530, 631 502
            C 639 494, 643 476, 644 456
            C 645 438, 641 428, 634 428
            C 632 394, 620 352, 600 324
            C 584 304, 562 299, 535 300
            Z
          "
        />
      </g>
    </svg>
  `);

  const { data, info } = await sharp(inputPath)
    .resize(width, height, { fit: "fill" })
    .modulate({ brightness: 1.04, saturation: 1.06 })
    .sharpen({ sigma: 1.0 })
    .composite([{ input: silhouetteMask, blend: "dest-in" }])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Remove qualquer resquício de luz laranja/vermelha do letreiro APENAS nas bordas da camiseta (cinza/preta) e topo do cabelo
  const pixels = new Uint8Array(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = pixels[idx + 3];
      if (a === 0) continue;

      // Protege 100% do rosto, barba, orelhas, pescoço e braços tatuados
      const inLeftShoulderEdge = y > 575 && y < 785 && x < 442;
      const inRightShoulderEdge = y > 575 && y < 785 && x > 622;
      const inHairTopEdge = y < 328;

      if (inLeftShoulderEdge || inRightShoulderEdge || inHairTopEdge) {
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        // A camiseta é cinza/azulada (fria) e o cabelo é preto; qualquer pixel quente aqui é reflexo/borda do letreiro
        if (r > 48 && r > g * 1.32 && r > b * 1.45) {
          const spillStrength = Math.min(1, (r - g * 1.15) / 65);
          if (a < 230 || y < 695) {
            pixels[idx + 3] = Math.round(a * (1 - spillStrength * 0.85));
          }
          const luma = Math.round(g * 0.8 + b * 0.2);
          pixels[idx] = Math.round(r * (1 - spillStrength) + luma * spillStrength);
          pixels[idx + 1] = Math.round(g * (1 - spillStrength * 0.6) + luma * (spillStrength * 0.6));
        }
      }
    }
  }

  const avatarBuf = await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: 210, top: 265, width: 650, height: 815 })
    .webp({ quality: 92, alphaQuality: 96 })
    .toBuffer();
  await fs.writeFile(path.join(OUT_DIR, "avatar-daniel.webp"), avatarBuf);

  console.log("✅ avatar-daniel.webp (Apenas o tatuador recortado) criado!");
}

async function processTattooPost(inputPath) {
  const tattooBuf = await sharp(inputPath)
    .resize(900, 1125, { fit: "cover", position: "centre" })
    .sharpen({ sigma: 0.9 })
    .webp({ quality: 86 })
    .toBuffer();
  await fs.writeFile(path.join(OUT_DIR, "tattoo-fe.webp"), tattooBuf);
  console.log("✅ tattoo-fe.webp criado!");
}

// 4. Gera Textura Realista Seamless da Parede de Tijolos do Estúdio Thórin (Tijolo Terracota/Vinho Bicolor + Rejunte Mineral)
async function processBrickTexture() {
  console.log("🧱 Gerando textura HD seamless da Parede de Tijolos do Thórin...");
  const width = 640;
  const height = 320;
  const buf = new Uint8Array(width * height * 3);

  const rows = 4;
  const cols = 4;
  const brickH = height / rows; // 80px
  const brickW = width / cols;  // 160px
  const mortarH = 7;
  const mortarV = 7;

  // Hash determinístico periódico p/ ruído mineral 100% seamless nas bordas do tile
  const hash = (x, y) => {
    const px = ((x % 64) + 64) % 64;
    const py = ((y % 32) + 32) % 32;
    let n = Math.sin(px * 127.1 + py * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  };

  const smoothNoise = (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };

  const fbm = (x, y) =>
    smoothNoise(x, y) * 0.55 +
    smoothNoise(x * 2, y * 2) * 0.3 +
    smoothNoise(x * 4, y * 4) * 0.15;

  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / brickH);
    const localY = y - row * brickH;
    const rowOffset = (row % 2) * (brickW / 2);

    for (let x = 0; x < width; x++) {
      const shiftedX = (x + rowOffset) % width;
      const col = Math.floor(shiftedX / brickW);
      const localX = shiftedX - col * brickW;

      const idx = (y * width + x) * 3;
      const nx = (x / width) * 64;
      const ny = (y / height) * 32;
      const grain = fbm(nx, ny) - 0.5;
      const fineGrain = (hash(x, y) - 0.5) * 0.12;

      // Distância p/ o rejunte (mortar) c/ leve ondulação orgânica nas bordas
      const edgeWaveX = (smoothNoise(nx * 0.5, ny * 1.0) - 0.5) * 2.2;
      const edgeWaveY = (smoothNoise(nx * 1.0, ny * 0.5) - 0.5) * 2.0;

      const distTop = localY + edgeWaveY;
      const distBottom = brickH - localY - edgeWaveY;
      const distLeft = localX + edgeWaveX;
      const distRight = brickW - localX - edgeWaveX;

      const inMortarY = distTop < mortarH / 2 || distBottom < mortarH / 2;
      const inMortarX = distLeft < mortarV / 2 || distRight < mortarV / 2;

      if (inMortarY || inMortarX) {
        // Rejunte mineral claro/acinzentado (fiel à foto real do estúdio, escurecido p/ dark mode elegante)
        const mDepth = Math.min(
          inMortarY ? Math.min(distTop, distBottom) : 99,
          inMortarX ? Math.min(distLeft, distRight) : 99
        );
        const grooveShadow = Math.max(0.65, Math.min(1, 0.72 + (mDepth / (mortarH / 2)) * 0.28));
        const baseM = (74 + grain * 26 + fineGrain * 30) * grooveShadow;
        buf[idx] = Math.min(255, Math.max(0, Math.round(baseM * 1.06)));     // R (tom pedra quente)
        buf[idx + 1] = Math.min(255, Math.max(0, Math.round(baseM * 0.94))); // G
        buf[idx + 2] = Math.min(255, Math.max(0, Math.round(baseM * 0.90))); // B
      } else {
        // Interior do Tijolo: Borda terracota/vermelha viva + núcleo vinho queimado (idêntico à parede da foto tattoo-fe)
        const brickSeed = hash(col * 17 + row * 31, row * 13);
        const normX = (localX - mortarV / 2) / (brickW - mortarV);
        const normY = (localY - mortarH / 2) / (brickH - mortarH);

        // Distância normalizada do centro do tijolo (0 no centro, 1 na borda)
        const dx = Math.abs(normX - 0.5) * 2;
        const dy = Math.abs(normY - 0.5) * 2;
        const edgeFactor = Math.pow(Math.max(dx, dy), 1.65);

        // Relevo 3D (Bevel): topo iluminado pela luz do estúdio, base com sombra
        const topHighlight = normY < 0.14 ? (1 - normY / 0.14) * 28 : 0;
        const bottomShadow = normY > 0.85 ? ((normY - 0.85) / 0.15) * -24 : 0;
        const leftHighlight = normX < 0.08 ? (1 - normX / 0.08) * 14 : 0;

        // Cor do centro (vinho escuro queimado) vs borda (vermelho terracota intenso)
        const coreR = 66 + (brickSeed - 0.5) * 18;
        const coreG = 14 + (brickSeed - 0.5) * 6;
        const coreB = 16 + (brickSeed - 0.5) * 6;

        const rimR = 146 + (brickSeed - 0.5) * 24;
        const rimG = 32 + (brickSeed - 0.5) * 10;
        const rimB = 28 + (brickSeed - 0.5) * 8;

        const r = coreR * (1 - edgeFactor * 0.78) + rimR * (edgeFactor * 0.78) + grain * 28 + fineGrain * 25 + topHighlight + bottomShadow + leftHighlight;
        const g = coreG * (1 - edgeFactor * 0.78) + rimG * (edgeFactor * 0.78) + grain * 10 + fineGrain * 10 + topHighlight * 0.35 + bottomShadow * 0.3;
        const b = coreB * (1 - edgeFactor * 0.78) + rimB * (edgeFactor * 0.78) + grain * 10 + fineGrain * 10 + topHighlight * 0.3 + bottomShadow * 0.3;

        buf[idx] = Math.min(255, Math.max(0, Math.round(r)));
        buf[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
        buf[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      }
    }
  }

  const brickBuf = await sharp(buf, { raw: { width, height, channels: 3 } })
    .sharpen({ sigma: 0.7 })
    .webp({ quality: 90 })
    .toBuffer();

  await fs.writeFile(path.join(OUT_DIR, "brick-texture.webp"), brickBuf);
  console.log("✅ brick-texture.webp (Parede de Tijolos Bicolor c/ Rejunte Realista) criado!");
}

async function run() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  let files = [];
  try {
    files = await fs.readdir(RAW_DIR);
  } catch {
    console.log("ℹ️ Diretório raw/ não encontrado; utilizando assets já presentes em public/assets/");
  }

  const avatarFile = files.find((f) => f.includes("733873673") || f.toLowerCase().includes("avatar") || f.toLowerCase().includes("daniel"));
  const tattooFile = files.find((f) => f.includes("840642445") || f.toLowerCase().includes("tattoo") || f.toLowerCase().includes("fe"));
  const logoFile = files.find(
    (f) =>
      f.includes("0779dc35") ||
      f.toLowerCase().includes("image") ||
      f.toLowerCase().includes("logo") ||
      (f !== avatarFile && f !== tattooFile && /\.(jpe?g|png|webp)$/i.test(f))
  );

  if (logoFile) await processLogoAndFire(path.join(RAW_DIR, logoFile));
  if (avatarFile) await processHeroPortrait(path.join(RAW_DIR, avatarFile));
  if (tattooFile) await processTattooPost(path.join(RAW_DIR, tattooFile));
  await processBrickTexture();

  console.log("🎉 Assets de Motion v2 gerados com sucesso!");
}

run();
