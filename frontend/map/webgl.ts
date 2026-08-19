export function supportsWebGL2(): boolean {
  if (typeof document === 'undefined' || typeof WebGL2RenderingContext === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null;
  } catch {
    return false;
  }
}
