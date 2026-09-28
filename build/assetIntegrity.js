// Node-only pixel integrity tooling. Do not import from application modules.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function encodeLosslessRaster(input, format = 'webp') {
  assert.ok(format === 'webp' || format === 'png', 'Only lossless WebP and PNG are supported');
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const encoder = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  const encoded = await (format === 'webp'
    ? encoder.webp({ lossless: true, exact: true, effort: 6 })
    : encoder.png({ compressionLevel: 9 })).toBuffer();
  const decoded = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(decoded.info.width, info.width);
  assert.equal(decoded.info.height, info.height);
  assert.ok(decoded.data.equals(data), 'Lossless conversion changed RGBA pixels');
  return { encoded, width: info.width, height: info.height, rgbaSha256: sha256(data) };
}

export async function verifyAssetIntegrity(assetRoot = fileURLToPath(new URL('../public/', import.meta.url))) {
  const manifest = JSON.parse(await readFile(path.resolve(assetRoot, '../build/assetBaseline.json'), 'utf8'));
  assert.equal(manifest.schema, 1);
  assert.ok(manifest.images.length > 0);
  for (const entry of manifest.images) {
    const target = path.resolve(assetRoot, entry.file);
    assert.ok(!path.relative(assetRoot, target).startsWith('..'), 'Asset must remain in public');
    const encoded = await readFile(target);
    assert.equal(sha256(encoded), entry.sha256, `${entry.file}: encoded fingerprint changed`);
    const { data, info } = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, entry.width, entry.file);
    assert.equal(info.height, entry.height, entry.file);
    assert.equal(sha256(data), entry.rgbaSha256, `${entry.file}: RGBA pixels changed`);

  }
  return manifest.images.length;
}

export async function verifySoundIntegrity(assetRoot = fileURLToPath(new URL('../public/', import.meta.url))) {
  const manifest = JSON.parse(await readFile(path.join(assetRoot, 'sounds/sources.json'), 'utf8'));
  assert.equal(manifest.schema, 1);
  assert.ok(manifest.sounds.length > 0);
  for (const sound of manifest.sounds) {
    assert.equal(path.basename(sound.file), sound.file, 'Sound must be inside public/sounds');
    const bytes = await readFile(path.join(assetRoot, 'sounds', sound.file));
    assert.equal(sha256(bytes), sound.sha256, `${sound.file}: audio fingerprint changed`);
  }
  return manifest.sounds.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(`Verified ${await verifyAssetIntegrity()} images: exact dimensions and RGBA pixels.`);
  console.log(`Verified ${await verifySoundIntegrity()} recordings.`);
}
