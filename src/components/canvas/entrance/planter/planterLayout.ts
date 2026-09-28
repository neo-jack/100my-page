import * as THREE from 'three';

export interface PlanterPart {
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  soil?: boolean;
}

/** All coordinates are entrance-local. Rendering and collisions share these exact boxes. */
export function createPlanterLayout(groundY: number, wallFrontZ: number) {
  return [-2.5, 2.5].map((x, index) => {
    const width = 1.86;
    const depth = 0.68;
    const height = 0.46;
    const wall = 0.065;
    const rimOverhang = 0.0225;
    // Keep the back panel and its rim against the wall, with only a depth-buffer clearance.
    const backZ = wallFrontZ + 0.001;
    const z = backZ + depth / 2;
    const soilY = groundY + 0.35;
    const parts: PlanterPart[] = [
      { name: 'front', position: [x, groundY + height / 2, z + (depth - wall) / 2], size: [width, height, wall] },
      { name: 'back', position: [x, groundY + height / 2, z - (depth - wall) / 2], size: [width, height, wall] },
      ...[-1, 1].map((side): PlanterPart => ({ name: `side-${side}`,
        position: [x + side * (width - wall) / 2, groundY + height / 2, z], size: [wall, height, depth - wall * 2] })),
      // The rear rim overhangs inward only, so it cannot protrude through the wall.
      { name: 'rim--1', position: [x, groundY + height, backZ + (wall + rimOverhang) / 2],
        size: [width + rimOverhang * 2, 0.055, wall + rimOverhang] },
      { name: 'rim-1', position: [x, groundY + height, z + (depth - wall) / 2],
        size: [width + rimOverhang * 2, 0.055, wall + rimOverhang * 2] },
      ...[-1, 1].map((side): PlanterPart => ({ name: `end-rim-${side}`,
        position: [x + side * (width - wall) / 2, groundY + height, z], size: [wall + 0.045, 0.055, depth - wall * 2] })),
      { name: 'soil', position: [x, (groundY + soilY) / 2, z], size: [width - wall * 2, soilY - groundY, depth - wall * 2], soil: true },
    ];
    // The visible soil opening excludes the inward rim overhang and a small edge clearance.
    const soilInset = wall + rimOverhang + 0.012;
    const soilBounds = new THREE.Box3(
      new THREE.Vector3(x - width / 2 + soilInset, soilY, backZ + soilInset),
      new THREE.Vector3(x + width / 2 - soilInset, soilY, backZ + depth - soilInset),
    );
    return { id: index === 0 ? 'left' : 'right', x, z, soilY, soilBounds, parts };
  });
}

export type PlanterLayout = ReturnType<typeof createPlanterLayout>;

export function createPlanterColliders(layout: PlanterLayout) {
  return layout.flatMap(({ parts }) => parts.map(({ position, size }) => {
    const center = new THREE.Vector3(...position);
    const half = new THREE.Vector3(...size).multiplyScalar(0.5);
    return new THREE.Box3(center.clone().sub(half), center.clone().add(half));
  }));
}
