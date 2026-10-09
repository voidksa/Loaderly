type Classifier = (row: number, column: number, scale: number, pixels: ArrayLike<number>, stride: number) => number;
type Detection = [number, number, number, number];
declare const pico: {
  unpack_cascade(bytes: Int8Array): Classifier;
  run_cascade(image: { pixels: ArrayLike<number>; nrows: number; ncols: number; ldim: number }, classifier: Classifier,
    params: { shiftfactor: number; minsize: number; maxsize: number; scalefactor: number }): Detection[];
  cluster_detections(detections: Detection[], overlap: number): Detection[];
};
export default pico;
