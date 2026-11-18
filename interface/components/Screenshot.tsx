import type { EtatRegle } from "../lib/states";

export interface ScreenshotImage { url: string; nom: string; disponible: boolean }
export interface Zone { numero: number; etat: EtatRegle; x: number; y: number; largeur: number; hauteur: number }

export const WIDTH = 1280;
export const HEIGHT = 900;

// A capture of the tested software, or, while its file is missing, a frame of the same ratio that names the expected file.
// With `recadrer`, a capture that has zones is enlarged on them (up to 3 times), the zones kept in view.
function crop(zones: Zone[]) {
  if (!zones.length) return undefined;
  const left = Math.min(...zones.map((z) => z.x)), top = Math.min(...zones.map((z) => z.y));
  const right = Math.max(...zones.map((z) => z.x + z.largeur)), bottom = Math.max(...zones.map((z) => z.y + z.hauteur));
  const scale = Math.max(1, Math.min(3, WIDTH / (right - left + 420), HEIGHT / (bottom - top + 300)));
  const cx = Math.min(Math.max((left + right) / 2, WIDTH / scale / 2), WIDTH - WIDTH / scale / 2);
  const cy = Math.min(Math.max((top + bottom) / 2, HEIGHT / scale / 2), HEIGHT - HEIGHT / scale / 2);
  return { transform: `scale(${scale}) translate(${(WIDTH / scale / 2 - cx) / WIDTH * 100}%, ${(HEIGHT / scale / 2 - cy) / HEIGHT * 100}%)`, transformOrigin: "0 0" };
}

export function Screenshot({ image, legende, zones = [], recadrer = false }: { image: ScreenshotImage; legende?: string; zones?: Zone[]; recadrer?: boolean }) {
  const zoom = recadrer && image.disponible ? crop(zones) : undefined;
  return (
    <figure className="capture">
      <div className="capture-cadre" style={zoom ? { overflow: "hidden" } : undefined}>
        <div className="capture-contenu" style={zoom}>
        {image.disponible ? (
          <img src={image.url} alt={legende ?? image.nom} width={WIDTH} height={HEIGHT} />
        ) : (
          <div className="capture-attendue">
            <span>Capture attendue</span>
            <code>{image.nom}</code>
            <span>{WIDTH} × {HEIGHT}</span>
          </div>
        )}
        {zones.map((z) => (
          <span
            key={z.numero}
            className={`zone zone-${z.etat}`}
            style={{ left: `${(z.x / WIDTH) * 100}%`, top: `${(z.y / HEIGHT) * 100}%`, width: `${(z.largeur / WIDTH) * 100}%`, height: `${(z.hauteur / HEIGHT) * 100}%` }}
          >
            <b>{"ΑΒΓΔΕΖΗΘΙΚΛΜ"[z.numero - 1] ?? z.numero}</b>
          </span>
        ))}
        </div>
      </div>
      {legende && <figcaption>{zoom ? `${legende} Agrandie sur la zone.` : legende}</figcaption>}
    </figure>
  );
}
