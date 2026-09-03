import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgStandard = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#020617" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Rounded Canvas -->
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)" />
  <rect width="508" height="508" x="2" y="2" rx="98" fill="none" stroke="#334155" stroke-width="4" stroke-opacity="0.5" />

  <!-- Hostel/Operations Emblem -->
  <!-- Outer building architectural geometric contour -->
  <path d="M120 370 L120 200 L256 100 L392 200 L392 370 Z" fill="#1e293b" fill-opacity="0.8" stroke="url(#primaryGrad)" stroke-width="12" stroke-linejoin="round" />

  <!-- Inner stylized H & Bed / Operations lines -->
  <rect x="180" y="220" width="32" height="150" rx="6" fill="url(#primaryGrad)" />
  <rect x="300" y="220" width="32" height="150" rx="6" fill="url(#primaryGrad)" />
  <rect x="180" y="275" width="152" height="28" rx="6" fill="url(#primaryGrad)" />

  <!-- Glowing checkmark/badge for Operations -->
  <circle cx="370" cy="350" r="44" fill="#0f172a" stroke="#10b981" stroke-width="8" filter="url(#glow)" />
  <path d="M352 350 L365 363 L390 338" fill="none" stroke="#10b981" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Roof Peak Sparkle Accent -->
  <circle cx="256" cy="100" r="14" fill="#38bdf8" filter="url(#glow)" />
</svg>
`;

const svgMaskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#020617" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Full-bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Scaled content inside safe zone (80% box in center: 60px to 452px) -->
  <g transform="translate(51, 51) scale(0.8)">
    <path d="M120 370 L120 200 L256 100 L392 200 L392 370 Z" fill="#1e293b" fill-opacity="0.9" stroke="url(#primaryGrad)" stroke-width="14" stroke-linejoin="round" />

    <rect x="180" y="220" width="32" height="150" rx="6" fill="url(#primaryGrad)" />
    <rect x="300" y="220" width="32" height="150" rx="6" fill="url(#primaryGrad)" />
    <rect x="180" y="275" width="152" height="28" rx="6" fill="url(#primaryGrad)" />

    <circle cx="370" cy="350" r="46" fill="#0f172a" stroke="#10b981" stroke-width="10" filter="url(#glow)" />
    <path d="M350 350 L364 364 L392 336" fill="none" stroke="#10b981" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />

    <circle cx="256" cy="100" r="16" fill="#38bdf8" filter="url(#glow)" />
  </g>
</svg>
`;

async function run() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgStandard.trim());

  // Generate 192x192
  await sharp(Buffer.from(svgStandard))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // Generate 512x512
  await sharp(Buffer.from(svgStandard))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // Generate maskable 512x512
  await sharp(Buffer.from(svgMaskable))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Generate apple-touch-icon (180x180)
  await sharp(Buffer.from(svgStandard))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Generate badge 72x72 for push notifications
  await sharp(Buffer.from(svgStandard))
    .resize(72, 72)
    .png()
    .toFile(path.join(publicDir, 'badge-72x72.png'));

  console.log('Successfully generated all PWA icons!');
}

run().catch(console.error);
