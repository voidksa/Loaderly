import pico from './vendor/pico';
import model from './vendor/facefinder.json';

let classifier: ReturnType<typeof pico.unpack_cascade> | undefined;

// Bundled model: no network, native browser API, or user uploads are required.
export function detectFaces(pixels: Uint8ClampedArray, width: number, height: number) {
  classifier ??= pico.unpack_cascade(Int8Array.from(atob(model.base64), char => char.charCodeAt(0)));
  return pico.cluster_detections(pico.run_cascade(
    { pixels, nrows: height, ncols: width, ldim: width }, classifier,
    { shiftfactor: 0.1, minsize: 24, maxsize: Math.min(width, height), scalefactor: 1.1 }
  ), 0.2).filter(face => face[3] > 5).map(([y, x, size]) => ({
    x: x - size / 2, y: y - size / 2, width: size, height: size
  }));
}
