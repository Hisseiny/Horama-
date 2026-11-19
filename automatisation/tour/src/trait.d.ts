// The two signs of proof of the charter (docs/da/trait.js, copied as src/trait.js): one stroke of miltos around a
// proven defect, a row of ochre dots under a doubt.
type Rect = { x: number; y: number; w: number; h: number };
export function tracerDefaut(svg: SVGSVGElement, rect: Rect, options?: { duree?: number; epaisseur?: number; instant?: boolean }): void;
export function poserDoute(svg: SVGSVGElement, rect: Rect, options?: { pas?: number; rayon?: number; instant?: boolean }): void;
