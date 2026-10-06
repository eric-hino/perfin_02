"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import estilos from "./cabecalho.module.css";

interface Props {
  href: string;
  prefixo?: string;
  children: React.ReactNode;
}

/** Link da navegação principal, marcado quando a rota atual é a dele. */
export default function LinkNav({ href, prefixo, children }: Props) {
  const caminho = usePathname();
  const base = prefixo ?? href;
  const ativo = caminho === href || caminho === base || caminho.startsWith(`${base}/`);
  return (
    <Link href={href} className={ativo ? `${estilos.link} ${estilos.ativo}` : estilos.link} aria-current={ativo ? "page" : undefined}>
      {children}
    </Link>
  );
}
