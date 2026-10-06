import type { Metadata } from "next";
import { Nunito_Sans, Poppins } from "next/font/google";

import "./globals.css";

// Substitutos oficiais da identidade Perfin: Poppins (Texta Alt) e Nunito Sans (Avenir).
const fonteTitulo = Poppins({ variable: "--fonte-titulo", subsets: ["latin"], weight: ["400", "700"] });
const fonteCorpo = Nunito_Sans({ variable: "--fonte-corpo", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Portal Perfin", template: "%s · Portal Perfin" },
  description: "Central de análise de indicadores econômicos do time Perfin.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fonteTitulo.variable} ${fonteCorpo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
