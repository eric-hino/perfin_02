import { Suspense } from "react";

import Assistente from "@/componentes/assistente/Assistente";
import Cabecalho from "@/componentes/layout/Cabecalho";
import { exigirPerfil } from "@/servicos/auth/sessao";

import estilos from "./portal.module.css";

export default async function LayoutPortal({ children }: { children: React.ReactNode }) {
  const sessao = await exigirPerfil("usuario");

  return (
    <>
      <Cabecalho email={sessao.email} admin={sessao.papel === "admin"} />
      <main id="conteudo" className={estilos.conteudo}>{children}</main>
      <Suspense fallback={null}>
        <Assistente />
      </Suspense>
      <footer className={estilos.rodape}>
        Fontes: BCB, IBGE, B3 e ANBIMA. Projeções implícitas em preços de mercado não são previsão nem recomendação.
      </footer>
    </>
  );
}
