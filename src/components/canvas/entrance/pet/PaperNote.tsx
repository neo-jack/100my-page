import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface PaperNoteProps {
  texture: THREE.Texture;
  position: [number, number, number];
  interactive: boolean;
  onOpen?: () => void;
}

const NOTE_HEIGHT = 1.12;
const NOTE_WIDTH = NOTE_HEIGHT * (210 / 297);

function createNoteAssets(source: THREE.Texture, anisotropy: number) {
  const texture = source.clone();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  const path = new THREE.CurvePath<THREE.Vector3>();
  const point = (x: number, y: number) => new THREE.Vector3(x, y, 0);
  path.add(new THREE.LineCurve3(point(-0.012, 0.035), point(-0.012, -0.035)));
  path.add(new THREE.QuadraticBezierCurve3(point(-0.012, -0.035), point(-0.012, -0.059), point(0.01, -0.059)));
  path.add(new THREE.QuadraticBezierCurve3(point(0.01, -0.059), point(0.032, -0.059), point(0.032, -0.035)));
  path.add(new THREE.LineCurve3(point(0.032, -0.035), point(0.032, 0.048)));
  path.add(new THREE.QuadraticBezierCurve3(point(0.032, 0.048), point(0.032, 0.081), point(0, 0.081)));
  path.add(new THREE.QuadraticBezierCurve3(point(0, 0.081), point(-0.032, 0.081), point(-0.032, 0.048)));
  path.add(new THREE.LineCurve3(point(-0.032, 0.048), point(-0.032, -0.046)));
  path.add(new THREE.QuadraticBezierCurve3(point(-0.032, -0.046), point(-0.032, -0.083), point(0.009, -0.083)));
  path.add(new THREE.QuadraticBezierCurve3(point(0.009, -0.083), point(0.051, -0.083), point(0.051, -0.046)));
  path.add(new THREE.LineCurve3(point(0.051, -0.046), point(0.051, 0.032)));
  const geometries = {
    paper: new THREE.PlaneGeometry(NOTE_WIDTH, NOTE_HEIGHT),
    clip: new THREE.TubeGeometry(path, 80, 0.004, 6, false),
    pin: new THREE.SphereGeometry(0.008, 8, 6),
  };
  const materials = {
    paper: new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.15, toneMapped: false, fog: false }),
    clip: new THREE.MeshBasicMaterial({ color: '#6e7066' }),
    shadow: new THREE.MeshBasicMaterial({ color: '#46493f', transparent: true, opacity: 0.16, depthWrite: false }),
  };
  // Deepen graphite strokes; only blend the light paper tones toward the adjacent wall's gray.
  // Blend only RGB so the torn-edge alpha remains intact and the wall does not show through.
  materials.paper.onBeforeCompile = (shader) => {
    shader.uniforms.notePaperTone = { value: new THREE.Color('#d4d4d4') };
    shader.fragmentShader = `uniform vec3 notePaperTone;\n${shader.fragmentShader}`.replace('#include <map_fragment>', /* glsl */`
      #include <map_fragment>
      diffuseColor.rgb = clamp((diffuseColor.rgb - vec3(0.57)) * 1.9 + vec3(0.57), 0.035, 1.0);
      float paperLuminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
      float paperBlend = smoothstep(0.4, 0.7, paperLuminance) * 0.35;
      diffuseColor.rgb = mix(diffuseColor.rgb, notePaperTone, paperBlend);
    `);
  };
  materials.paper.customProgramCacheKey = () => 'paper-note-wall-tone-v5';
  return { geometries, materials, dispose() {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
    texture.dispose();
  } };
}

/** A graphite AI conversation architecture note clipped above the shared pet shelf. */
export default function PaperNote({ texture, position, interactive, onOpen }: PaperNoteProps) {
  const gl = useThree((state) => state.gl);
  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const assets = useMemo(() => createNoteAssets(texture, anisotropy), [texture, anisotropy]);
  const hovered = useRef(false);
  useEffect(() => () => assets.dispose(), [assets]);
  useEffect(() => () => {
    if (hovered.current) document.body.style.cursor = 'auto';
    hovered.current = false;
  }, [interactive]);

  return (
    <group name="entrance-paper-note" position={position} dispose={null}>
      <mesh geometry={assets.geometries.paper} material={assets.materials.paper}
        onClick={(event) => {
          if (!interactive || event.delta > 6) return;
          event.stopPropagation();
          onOpen?.();
        }}
        onPointerOver={(event) => {
          if (!interactive) return;
          event.stopPropagation();
          hovered.current = true;
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          if (hovered.current) document.body.style.cursor = 'auto';
          hovered.current = false;
        }}
      />
      <group name="paper-note-clip" position={[0, NOTE_HEIGHT / 2 - 0.014, 0.014]} rotation-z={-0.16}>
        <mesh geometry={assets.geometries.clip} material={assets.materials.shadow}
          position={[0.005, -0.005, -0.009]} raycast={() => {}} />
        <mesh geometry={assets.geometries.clip} material={assets.materials.clip} raycast={() => {}} />
        <mesh geometry={assets.geometries.pin} material={assets.materials.clip}
          position={[0, 0.073, -0.004]} scale={[1, 1, 0.5]} raycast={() => {}} />
      </group>
    </group>
  );
}
