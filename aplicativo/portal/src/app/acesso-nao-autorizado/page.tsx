import type { Metadata } from "next";
import Link from "next/link";

import estilos from "../login/login.module.css";
import auth from "@/componentes/auth/auth.module.css";

export const metadata: Metadata = { title: "Acesso não autorizado" };

export default async function AcessoNaoAutorizado({ searchParams }: PageProps<"/acesso-nao-autorizado">) {
  const { motivo } = await searchParams;
  const soAdmin = motivo === "admin";

  return (
    <main className={estilos.pagina}>
      <section className={estilos.caixa} aria-labelledby="titulo">
        <p className={estilos.marca}>Portal Perfin</p>
        <h1 id="titulo">Acesso não autorizado</h1>
        <p className={estilos.subtitulo}>
          {soAdmin
            ? "Esta área é exclusiva de administradores."
            : "Seu acesso foi bloqueado ou removido pelo administrador."}
        </p>
        {soAdmin ? (
          <Link href="/visao-geral" className={`${auth.botaoEscuro} ${auth.botaoLink}`}>
            Voltar ao Portal
          </Link>
        ) : (
          <form action="/auth/sair" method="post">
            <button type="submit" className={auth.botaoEscuro}>Sair e entrar com outra conta</button>
          </form>
        )}
      </section>
    </main>
  );
}
