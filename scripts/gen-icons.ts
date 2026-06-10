import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

async function generate() {
  const width = 512;
  const height = 512;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Create a simple image since we don't have SVG parsing in node-canvas readily working with complex gradients without libraries.
  // Wait, let's just make it a colored rectangle with text, just to satisfy the manifest.
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Suino', 256, 220);
  ctx.fillText('Saude', 256, 320);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('public/icon-512x512.png', buffer);
  
  const canvas192 = createCanvas(192, 192);
  const ctx192 = canvas192.getContext('2d');
  ctx192.fillStyle = '#0F172A';
  ctx192.fillRect(0, 0, 192, 192);
  ctx192.fillStyle = '#F59E0B';
  ctx192.font = 'bold 40px sans-serif';
  ctx192.textAlign = 'center';
  ctx192.fillText('Suino', 96, 80);
  ctx192.fillText('Saude', 96, 120);
  
  const buffer192 = canvas192.toBuffer('image/png');
  fs.writeFileSync('public/icon-192x192.png', buffer192);
}

generate().catch(console.error);
