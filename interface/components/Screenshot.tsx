import type { EtatRegle } from "../lib/states";

export interface ScreenshotImage { url: string; nom: string; disponible: boolean }
export interface Zone { numero: number; etat: EtatRegle; x: number; y: number; largeur: number; hauteur: number }

export const WIDTH = 1280;
export const HEIGHT = 900;

// A capture of the tested software, or, while its file is missing, a frame of the same ratio that names the expected file.
export function Screenshot({ image, legende, zones = [] }: { image: ScreenshotImage; legende?: string; zones?: Zone[] }) {
  return (
    <figure className="capture">
      <div className="capture-cadre">
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
            <b>{z.numero}</b>
          </span>
        ))}
      </div>
      {legende && <figcaption>{legende}</figcaption>}
    </figure>
  );
}
