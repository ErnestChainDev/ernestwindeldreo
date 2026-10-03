import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const directory = path.resolve('src/assets');
let before = 0;
let after = 0;
let count = 0;
for (const name of await readdir(directory, { recursive: true })) {
  if (!/\.(png|jpg)$/i.test(name) || name === 'hero.png') continue;
  const source = path.join(directory, name);
  const target = source.replace(/\.(png|jpg)$/i, '.webp');
  const width = name.startsWith('avatargroup') ? 192 : name.startsWith('avatar-me') ? 512 : name.startsWith('certificates') ? 1800 : 1200;
  await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: name.startsWith('certificates') ? 88 : 82, effort: 6 }).toFile(target);
  before += (await stat(source)).size;
  after += (await stat(target)).size;
  count++;
}
await sharp(path.join(directory, 'Logo.png')).resize({ width: 512 }).webp({ quality: 82, effort: 6 }).toFile(path.join(directory, 'Logo-small.webp'));
await sharp(path.join(directory, 'Logo.png')).resize({ width: 224 }).webp({ quality: 90, effort: 6 }).toFile(path.join(directory, 'Logo-mark.webp'));
console.log(JSON.stringify({ count, originalBytes: before, optimizedBytes: after, reduction: `${Math.round((1 - after / before) * 100)}%` }));
