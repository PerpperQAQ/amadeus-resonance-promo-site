import { readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const manifest = JSON.parse(await readFile(new URL('./pages-assets.json', import.meta.url), 'utf8'));
const root = resolve(process.argv[2] || 'public');
for (const file of manifest.files) {
  const path = resolve(root, file.path);
  if (!path.startsWith(root + '/')) throw new Error(`Invalid asset path: ${file.path}`);
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size !== file.bytes) throw new Error(`Missing or changed asset: ${file.path}`);
  const hash = createHash('sha256').update(await readFile(path)).digest('hex');
  if (hash !== file.sha256) throw new Error(`Asset checksum mismatch: ${file.path}`);
}
console.log(`Verified ${manifest.files.length} runtime assets in ${root} (${manifest.release}).`);
