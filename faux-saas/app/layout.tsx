import type { ReactNode } from "react";
import { CSS } from "./styles.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facturo" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
