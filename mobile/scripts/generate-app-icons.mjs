/**
 * Generates PNG app assets from SVG sources.
 * Run: npm run generate:icons
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '../assets');

const LIGHT_BG = '#EAF1EF';
const DARK_BG = '#15201D';

function readSvg(filename) {
  return fs.readFileSync(path.join(assetsDir, filename), 'utf8');
}

function innerSvgMarkup(svg) {
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

function canvasSvg({ size, bg, inner, viewW = 80, viewH = 92, padding = 0.18 }) {
  const innerMax = size * (1 - padding * 2);
  const scale = Math.min(innerMax / viewW, innerMax / viewH);
  const w = viewW * scale;
  const h = viewH * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  const bgRect = bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${bgRect}
<g transform="translate(${x}, ${y}) scale(${scale})">
${innerSvgMarkup(inner)}
</g>
</svg>`;
}

function renderPng(svg, outPath) {
  const png = new Resvg(svg, { background: 'transparent' }).render().asPng();
  fs.writeFileSync(outPath, png);
}

const iconLight = readSvg('icon.svg');
const iconDark = readSvg('icon-dark-bg.svg');

renderPng(canvasSvg({ size: 1024, bg: LIGHT_BG, inner: iconLight }), path.join(assetsDir, 'icon.png'));
renderPng(canvasSvg({ size: 1024, bg: null, inner: iconLight, padding: 0.22 }), path.join(assetsDir, 'android-icon-foreground.png'));
renderPng(canvasSvg({ size: 1024, bg: null, inner: iconLight }), path.join(assetsDir, 'android-icon-monochrome.png'));
renderPng(canvasSvg({ size: 1024, bg: null, inner: iconDark, padding: 0.22 }), path.join(assetsDir, 'splash-icon.png'));
renderPng(canvasSvg({ size: 48, bg: LIGHT_BG, inner: iconLight, padding: 0.12 }), path.join(assetsDir, 'favicon.png'));

console.log('Generated app icons in mobile/assets/');
