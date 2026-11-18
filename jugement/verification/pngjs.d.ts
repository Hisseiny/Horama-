// The part of pngjs 7 used here (the package ships no types).
declare module "pngjs" {
  export class PNG {
    constructor(options: { width: number; height: number });
    width: number;
    height: number;
    data: Buffer; // RGBA, 4 bytes per pixel
    static sync: { read(buffer: Buffer): PNG; write(png: PNG): Buffer };
  }
}
