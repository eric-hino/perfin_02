import type { Metadata } from "next";

import AbasLogin from "@/componentes/auth/AbasLogin";
import BotaoGoogle from "@/componentes/auth/BotaoGoogle";
import FormularioCadastro from "@/componentes/auth/FormularioCadastro";
import FormularioSenha from "@/componentes/auth/FormularioSenha";
import { abaDoLogin } from "@/dominio/auth/cadastro";

import estilos from "./login.module.css";

export const metadata: Metadata = { title: "Entrar" };

const MENSAGENS: Record<string, string> = {
  google: "Não foi possível iniciar o login com o Google. Tente novamente.",
  sessao: "Não foi possível concluir o login. Tente novamente.",
  link: "Link inválido ou expirado. Peça um novo.",
  conta_diferente: "Use a mesma conta Google com que você entrou.",
  bloqueado: "Seu acesso foi bloqueado pelo administrador.",
};

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { erro, aba: valorAba } = await searchParams;
  const aba = abaDoLogin(valorAba);
  const mensagem = typeof erro === "string" && Object.hasOwn(MENSAGENS, erro) ? MENSAGENS[erro] : undefined;

  return (
    <main className={estilos.pagina}>
      <section className={estilos.caixa} aria-labelledby="titulo-login">
        <p className={estilos.marca}>Perfin</p>
        <h1 id="titulo-login">Portal Perfin</h1>
        <p className={estilos.subtitulo}>Central de análise de indicadores econômicos.</p>

        <AbasLogin ativa={aba} />
        {mensagem && <p role="alert" className={estilos.erro}>{mensagem}</p>}

        <BotaoGoogle rotulo={aba === "cadastro" ? "Cadastrar com Google" : "Continuar com Google"} />
        <p className={estilos.divisor}>ou</p>
        {aba === "cadastro" ? <FormularioCadastro /> : <FormularioSenha />}
      </section>
    </main>
  );
}
