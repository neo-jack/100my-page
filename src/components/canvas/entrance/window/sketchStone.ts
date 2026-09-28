import * as THREE from 'three';

const RADIUS = 0.095;

/** Shared hand-drawn stone: an uneven pebble silhouette, matte facets and pencil edges. */
export function createSketchStone(paper: THREE.Texture) {
  // Non-indexed triangles keep the subtle graphite shading distinct on each stone facet.
  const geometry = new THREE.IcosahedronGeometry(RADIUS, 2);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  const tint = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).normalize();
    const unevenness = Math.sin(point.x * 8 + point.y * 5) * Math.cos(point.z * 7 - point.x * 3);
    const shoulder = Math.sin(point.y * 4 + point.z * 3) * 0.06;
    point.multiplyScalar(RADIUS * (1 + unevenness * 0.13 + shoulder));
    position.setXYZ(i, point.x * 1.16 + point.y * 0.12, point.y * 0.8, point.z * 0.94);
    const face = Math.floor(i / 3);
    const shade = 0.79 + (Math.sin(face * 73.19) * 0.5 + 0.5) * 0.21;
    tint.setRGB(shade, shade * 0.994, shade * 0.975);
    tint.toArray(colors, i * 3);
  }
  position.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const map = paper.clone();
  map.repeat.set(1.6, 1.2);
  map.offset.set(0.17, 0.08);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.needsUpdate = true;
  const bump = map.clone();
  bump.colorSpace = THREE.NoColorSpace;
  bump.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({
    map, bumpMap: bump, bumpScale: 0.0018,
    color: '#c4c3bc', emissive: '#c9c7bf', emissiveIntensity: 0.12,
    roughness: 1, metalness: 0, flatShading: true, vertexColors: true,
  });

  // Only pronounced ridges receive a pencil stroke, keeping the stone free of a wireframe grid.
  const edges = new THREE.EdgesGeometry(geometry, 28);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#625f58', transparent: true, opacity: 0.28 });
  const outlineMaterial = new THREE.MeshBasicMaterial({ color: '#65635c', side: THREE.BackSide });

  return {
    geometry, material, edges, edgeMaterial, outlineMaterial,
    dispose() {
      geometry.dispose();
      edges.dispose();
      material.dispose();
      edgeMaterial.dispose();
      outlineMaterial.dispose();
      map.dispose();
      bump.dispose();
    },
  };
}
