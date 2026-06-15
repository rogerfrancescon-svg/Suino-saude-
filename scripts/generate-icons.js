import sharp from 'sharp';
import fs from 'fs';

const svg = fs.readFileSync('public/icon.svg');

async function resize() {
  await sharp(svg)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192x192.png');
    
  await sharp(svg)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512x512.png');
    
  console.log('Icons generated successfully.');
}

resize().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
