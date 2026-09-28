import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isInternalRequest, isRetiredAssetRequest } from './productionBoundary.js';
import { noteFiles } from './notes.js';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export async function auditAssetRelease(outputDirectory, assetRoot = fileURLToPath(new URL('../public/', import.meta.url))) {
  const manifest = JSON.parse(await readFile(path.resolve(assetRoot, '../build/assetBaseline.json'), 'utf8'));
  const expected = new Set(manifest.images.map((image) => image.sha256));
  const noteRoot = path.resolve(assetRoot, '../src/data/note');
  const attachments = await noteFiles(noteRoot).catch((error) => { if (error.code === 'ENOENT') return []; throw error; });
  const noteImages = new Set(await Promise.all(attachments.filter((file) => /\.(?:webp|png|jpe?g)$/i.test(file)).map(async (file) => digest(await readFile(file)))));
  const soundManifest = JSON.parse(await readFile(path.join(assetRoot, 'sounds/sources.json'), 'utf8'));
  const unpublishedSounds = new Set(soundManifest.sounds.filter((sound) => sound.publish === false).map((sound) => sound.sha256));
  const expectedSounds = new Set(soundManifest.sounds.filter((sound) => sound.publish !== false).map((sound) => sound.sha256));
  const releasedSounds = new Set();
  const files = (await readdir(outputDirectory, { recursive: true, withFileTypes: true })).filter((entry) => entry.isFile());
  let rasterCount = 0;
  let bytes = 0;
  for (const entry of files) {
    const absolute = path.join(entry.parentPath, entry.name);
    const relative = path.relative(outputDirectory, absolute).replaceAll('\\', '/');
    assert.equal(isInternalRequest(relative) || isRetiredAssetRequest(relative), false, `Forbidden output: ${relative}`);
    const content = await readFile(absolute);
    bytes += content.length;
    if (/\.(?:mp3|ogg|wav|flac)$/i.test(relative)) {
      const fingerprint = digest(content);
      assert.equal(unpublishedSounds.has(fingerprint), false, `Disabled recording published: ${relative}`);
      if (expectedSounds.has(fingerprint)) releasedSounds.add(fingerprint);
    }
    if (/\.(?:webp|png|jpe?g)$/i.test(relative)) {
      const fingerprint = digest(content);
      assert.ok(expected.has(fingerprint) || noteImages.has(fingerprint), `Unverified raster image: ${relative}`);
      rasterCount++;
    }
    if (/\.(?:js|css|html)$/i.test(relative)) {
      assert.equal(/(?:["'`]\/(?:textures|sounds|fonts)\/|\/bgm\.mp3|reactduzybalon|szumwiatru|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp)/i.test(content.toString()), false, `Legacy asset reference in ${relative}`);
    }
  }
  assert.ok(rasterCount > 0, 'Release contains no verified images');
  assert.ok(files.some((entry) => entry.name === 'index.html'));
  assert.equal(releasedSounds.size, expectedSounds.size, 'Enabled recordings missing from release');
  return { files: files.length, verifiedImages: rasterCount, verifiedSounds: releasedSounds.size, bytes };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv[2], 'Usage: node build/auditAssetRelease.js OUTPUT_DIRECTORY');
  console.log(JSON.stringify(await auditAssetRelease(path.resolve(process.argv[2])), null, 2));
}
