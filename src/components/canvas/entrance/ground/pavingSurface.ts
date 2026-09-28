import * as THREE from 'three';

export interface PavingLayout {
  width: number;
  centerX: number;
  shoulder: number;
  leftLimit: number;
  rightLimit: number;
}

/** Shared by the mesh and alpha treatment, so both shoulders feather in the same world units. */
export function mapPavingX(u: number, layout: PavingLayout) {
  const x = (u - 0.5) * layout.width + layout.centerX;
  if (x > layout.shoulder) {
    const span = layout.rightLimit - layout.shoulder;
    return layout.shoulder + span * (1 - Math.exp(-(x - layout.shoulder) / span));
  }
  if (x < -layout.shoulder) {
    const span = -layout.shoulder - layout.leftLimit;
    return -layout.shoulder - span * (1 - Math.exp(-(-layout.shoulder - x) / span));
  }
  return x;
}

/** Keep the stone RGB and opaque interior; soften only the two outside alpha shoulders. */
export function featherPavingPixels(source: Uint8ClampedArray, width: number, height: number, layout: PavingLayout) {
  const left = new Float32Array(height);
  const right = new Float32Array(height);
  left.fill(-1);
  right.fill(-1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (source[(y * width + x) * 4 + 3] < 240) continue;
      if (left[y] < 0) left[y] = x;
      right[y] = x;
    }
  }
  const smooth = (edge: Float32Array, y: number) => {
    let total = 0;
    let weights = 0;
    for (let offset = -5; offset <= 5; offset++) {
      const row = THREE.MathUtils.clamp(y + offset, 0, height - 1);
      if (edge[row] < 0) continue;
      const weight = 6 - Math.abs(offset);
      total += edge[row] * weight;
      weights += weight;
    }
    return weights ? total / weights : -1;
  };
  const worldX = Float32Array.from({ length: width }, (_, x) => mapPavingX((x + 0.5) / width, layout));
  const result = new Uint8ClampedArray(source);
  for (let y = 0; y < height; y++) {
    const leftPixel = smooth(left, y);
    const rightPixel = smooth(right, y);
    // Keep the threshold contact and the naturally torn foreground end intact.
    const amount = THREE.MathUtils.smoothstep(y, 0, 48) * THREE.MathUtils.smoothstep(height - 1 - y, 0, 48);
    const leftX = mapPavingX((leftPixel + 0.5) / width, layout);
    const rightX = mapPavingX((rightPixel + 0.5) / width, layout);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (leftPixel >= 0 && rightPixel >= leftPixel) {
        const distance = Math.min(worldX[x] - leftX, rightX - worldX[x]);
        const fade = THREE.MathUtils.smoothstep(distance, -0.025, 0.025);
        result[i + 3] = Math.round(source[i + 3] * (1 - amount + amount * fade));
      }
      // Neutral hidden RGB prevents black fringes when mipmaps mix transparent border pixels.
      if (result[i + 3] === 0) result[i] = result[i + 1] = result[i + 2] = 225;
    }
  }
  return result;
}

export function createPavingEdgeMap(source: THREE.Texture, layout: PavingLayout, anisotropy: number) {
  const image = source.image as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Unable to prepare the paving edge texture');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height);
  const softened = featherPavingPixels(pixels.data, image.width, image.height, layout);
  // DataTexture stores the bottom row first; canvas pixels start at the top.
  const data = new Uint8Array(softened.length);
  const stride = image.width * 4;
  for (let y = 0; y < image.height; y++) {
    data.set(softened.subarray(y * stride, (y + 1) * stride), (image.height - 1 - y) * stride);
  }
  const map = new THREE.DataTexture(data, image.width, image.height, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = anisotropy;
  map.needsUpdate = true;
  return map;
}
