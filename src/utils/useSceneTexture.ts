import { useLayoutEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader, type Texture } from 'three';

/** Load/cache images without Drei's immediate bulk GPU upload; SceneWarmup owns upload scheduling. */
export function useSceneTexture(input: string, onLoad?: (texture: Texture) => void): Texture;
export function useSceneTexture(input: string[], onLoad?: (textures: Texture[]) => void): Texture[];
export function useSceneTexture<T extends Record<string, string>>(input: T, onLoad?: (textures: Texture[]) => void): { [K in keyof T]: Texture };
export function useSceneTexture(input: string | string[] | Record<string, string>, onLoad?: ((texture: Texture) => void) | ((textures: Texture[]) => void)): Texture | Texture[] | Record<string, Texture> {
  const keyed = typeof input === 'object' && !Array.isArray(input);
  const textures = useLoader(TextureLoader, keyed ? Object.values(input) : input);
  // Preserve Drei's raw-loader callback shape (object input receives an array).
  useLayoutEffect(() => {
    (onLoad as ((value: Texture | Texture[]) => void) | undefined)?.(textures);
  }, [onLoad, textures]);
  return useMemo(() => {
    if (!keyed) return textures;
    return Object.fromEntries(Object.keys(input).map((key, index) => [key, (textures as Texture[])[index]]));
  }, [input, keyed, textures]);
}

