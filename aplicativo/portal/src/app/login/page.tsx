import type { Metadata } from "next";

import FormularioSenha from "@/componentes/auth/FormularioSenha";
import BotaoGoogle from "@/componentes/auth/BotaoGoogle";

import estilos from "./login.module.css";

export const metadata: Metadata = { title: "Entrar" };

const MENSAGENS: Record<string, string> = {
  google: "Não foi possível iniciar o login com o Google. Tente novamente.",
  sessao: "Não foi possível concluir o login. Tente novamente.",
};

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { erro } = await searchParams;
  const mensagem = typeof erro === "string" ? MENSAGENS[erro] : undefined;

  return (
    <main className={estilos.pagina}>
      <section className={estilos.caixa} aria-labelledby="titulo-login">
        <p className={estilos.marca}>Perfin</p>
        <h1 id="titulo-login">Portal Perfin</h1>
        <p className={estilos.subtitulo}>Central de análise de indicadores econômicos do time.</p>

        {mensagem && <p role="alert" className={estilos.erro}>{mensagem}</p>}

        <BotaoGoogle rotulo="Entrar com Google" />

        <details className={estilos.admin}>
          <summary>Acesso do administrador (e-mail e senha)</summary>
          <FormularioSenha />
        </details>
      </section>
    </main>
  );
}
