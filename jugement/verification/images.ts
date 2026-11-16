/// <reference path="./pngjs.d.ts" />
import { PNG } from "pngjs";

// docs/decisions/2026-11-16-seuil-de-bruit.md
const TOLERANCE = 24; // a pixel differs when one channel (red, green, blue) is further apart than this
const REACH = 8; // differing pixels at most this far apart, on both axes, belong to the same zone
const MIN_PIXELS = 6; // a zone counts from this many differing pixels

export interface ImageZone {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  pixels: number; // differing pixels in the zone
}

export interface ImageComparison {
  sameSize: boolean; // false: nothing is compared
  size: { width: number; height: number };
  referenceSize: { width: number; height: number };
  differentPixels: number;
  rawZones: number; // zones before the minimum of pixels (« pixels bruts »)
  zones: ImageZone[]; // zones that count, from top to bottom
}

export function comparerImages(png: Uint8Array, reference: Uint8Array): ImageComparison {
  const [a, b] = [png, reference].map((bytes) => PNG.sync.read(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)));
  const { width, height } = a;
  const comparison: ImageComparison = {
    sameSize: width === b.width && height === b.height,
    size: { width, height },
    referenceSize: { width: b.width, height: b.height },
    differentPixels: 0,
    rawZones: 0,
    zones: [],
  };
  if (!comparison.sameSize) return comparison;

  // One pass from top to bottom. For each column, the last differing pixel seen and its zone: a differing pixel joins the zones
  // of the columns within reach whose last differing pixel is within reach too. Zones that meet are merged (union-find).
  const parent: number[] = [];
  const boxes: Array<{ left: number; top: number; right: number; bottom: number; pixels: number }> = [];
  const find = (zone: number) => {
    while (parent[zone] !== zone) zone = parent[zone] = parent[parent[zone]];
    return zone;
  };
  const lastRow = new Int32Array(width).fill(-REACH - 1);
  const lastZone = new Int32Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (
        Math.abs(a.data[i] - b.data[i]) <= TOLERANCE &&
        Math.abs(a.data[i + 1] - b.data[i + 1]) <= TOLERANCE &&
        Math.abs(a.data[i + 2] - b.data[i + 2]) <= TOLERANCE
      ) {
        continue;
      }
      comparison.differentPixels++;
      let zone = -1;
      for (let column = Math.max(0, x - REACH); column <= Math.min(width - 1, x + REACH); column++) {
        if (y - lastRow[column] > REACH) continue;
        const other = find(lastZone[column]);
        if (zone === -1) zone = other;
        else if (other !== zone) {
          parent[other] = zone;
          boxes[zone].left = Math.min(boxes[zone].left, boxes[other].left);
          boxes[zone].top = Math.min(boxes[zone].top, boxes[other].top);
          boxes[zone].right = Math.max(boxes[zone].right, boxes[other].right);
          boxes[zone].pixels += boxes[other].pixels;
        }
      }
      if (zone === -1) {
        zone = parent.length;
        parent.push(zone);
        boxes.push({ left: x, top: y, right: x, bottom: y, pixels: 0 });
      }
      const box = boxes[zone];
      box.left = Math.min(box.left, x);
      box.right = Math.max(box.right, x);
      box.bottom = y;
      box.pixels++;
      lastRow[x] = y;
      lastZone[x] = zone;
    }
  }
  const roots = boxes.filter((_, zone) => parent[zone] === zone);
  comparison.rawZones = roots.length;
  comparison.zones = roots
    .filter((box) => box.pixels >= MIN_PIXELS)
    .map((box) => ({ x: box.left, y: box.top, largeur: box.right - box.left + 1, hauteur: box.bottom - box.top + 1, pixels: box.pixels }))
    .sort((one, other) => one.y - other.y || one.x - other.x);
  return comparison;
}
