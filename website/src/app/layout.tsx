import type { Metadata } from "next";
import { Nunito_Sans, Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const fonteTitulo = Poppins({ variable: "--fonte-titulo", subsets: ["latin"], weight: ["400", "700"] });
const fonteCorpo = Nunito_Sans({ variable: "--fonte-corpo", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Perfin · Portal de indicadores",
  description: "Indicadores econômicos em destaque e calculadora de correção por IPCA e IGP-M.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonteTitulo.variable} ${fonteCorpo.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
