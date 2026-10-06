import Link from "next/link";

import TituloPagina from "@/componentes/ui/TituloPagina";
import ui from "@/componentes/ui/ui.module.css";
import { exigirPerfil } from "@/servicos/auth/sessao";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await exigirPerfil("admin");
  return (
    <>
      <TituloPagina titulo="Administração" subtitulo="Usuários, parâmetros de negócio e acompanhamento da coleta" />
      <nav aria-label="Seções da administração" className={ui.abas}>
        <Link href="/admin/usuarios">Usuários</Link>
        <Link href="/admin/parametros">Parâmetros</Link>
        <Link href="/admin/coleta">Coleta</Link>
      </nav>
      {children}
    </>
  );
}
