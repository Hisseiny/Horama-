"use client";

import { useEffect, useRef, useState } from "react";
import { HEIGHT, Screenshot, WIDTH, type ScreenshotImage, type Zone } from "../../../../../components/Screenshot";
import { plural, thousands } from "../../../../../lib/format";

export type View = "cote" | "rideau" | "pixels";
type Versioned = ScreenshotImage & { version: string };

const load = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });

function pixelsOf(image: HTMLImageElement) {
  const context = Object.assign(document.createElement("canvas"), { width: WIDTH, height: HEIGHT }).getContext("2d")!;
  context.drawImage(image, 0, 0, WIDTH, HEIGHT);
  return context.getImageData(0, 0, WIDTH, HEIGHT);
}

export function Comparison({ view, reference, tested, zones, rawZones, count }: {
  view: View;
  reference: Versioned;
  tested: Versioned;
  zones: Zone[];
  rawZones?: number; // zone count of the raw diff, from the verification result
  count: number; // gaps Horama keeps
}) {
  const [split, setSplit] = useState(50);
  const [different, setDifferent] = useState<number>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const ready = reference.disponible && tested.disponible;

  // Raw pixel difference, computed here in the browser: every pixel that differs, painted and counted.
  useEffect(() => {
    if (!ready) return;
    let stale = false;
    Promise.all([load(reference.url), load(tested.url)]).then(([a, b]) => {
      if (stale) return;
      const [before, after] = [pixelsOf(a).data, pixelsOf(b)];
      const paint = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--etat-defaut").trim().slice(1), 16);
      let n = 0;
      for (let i = 0; i < before.length; i += 4) {
        const differs = before[i] !== after.data[i] || before[i + 1] !== after.data[i + 1] || before[i + 2] !== after.data[i + 2];
        if (differs) n++;
        // Differing pixels take the paint colour, the others fade towards white so that the difference stands out.
        for (let c = 0; c < 3; c++) after.data[i + c] = differs ? (paint >> (16 - 8 * c)) & 255 : 255 - (255 - after.data[i + c]) * 0.3;
      }
      setDifferent(n);
      canvas.current?.getContext("2d")!.putImageData(after, 0, 0);
    });
    return () => { stale = true; };
  }, [ready, reference.url, tested.url, view]);

  const before = `Version ${reference.version}, référence.`;
  const after = `Version ${tested.version}, testée.`;

  return (
    <>
      {view === "cote" && (
        <div className="cote-a-cote">
          <Screenshot image={reference} legende={before} />
          <Screenshot image={tested} legende={`${after} ${zones.length ? "Zones d'écart entourées et numérotées." : "Aucune zone d'écart visuel."}`} zones={zones} />
        </div>
      )}

      {view === "rideau" && (
        <div className="rideau">
          <div className="rideau-images">
            <Screenshot image={reference} />
            <div className="rideau-dessus" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
              <Screenshot image={tested} zones={zones} />
            </div>
            <span className="rideau-trait" style={{ left: `${split}%` }} />
          </div>
          <label className="rideau-curseur">
            <span>Version {reference.version}</span>
            <input type="range" min={0} max={100} value={split} aria-label="Position du rideau" onChange={(e) => setSplit(Number(e.target.value))} />
            <span>Version {tested.version}</span>
          </label>
        </div>
      )}

      {view === "pixels" && (
        ready ? (
          <figure className="capture pixels">
            <div className="capture-cadre"><canvas ref={canvas} width={WIDTH} height={HEIGHT} /></div>
            <figcaption>Version {tested.version} estompée. Chaque pixel différent de la version {reference.version} est peint, sans tri.</figcaption>
          </figure>
        ) : (
          <div className="cote-a-cote">
            <Screenshot image={reference} legende={before} />
            <Screenshot image={tested} legende={after} />
          </div>
        )
      )}

      <p className="comparaison-phrase">
        Pixels bruts :{" "}
        {!ready ? "à calculer, les deux captures ne sont pas encore là"
          : different === undefined ? "calcul en cours"
          : `${thousands(different)} pixels différents sur ${thousands(WIDTH * HEIGHT)}`}
        , nombre de zones {rawZones ?? "à calculer"}. <b>Horama : {plural(count, "écart qui compte", "écarts qui comptent")}.</b>
      </p>
    </>
  );
}
