import type { Metadata } from "next";

import FormularioNovaSenha from "@/componentes/auth/FormularioNovaSenha";
import { exigirPerfil } from "@/servicos/auth/sessao";

import estilos from "../login/login.module.css";

export const metadata: Metadata = { title: "Nova senha" };

/** Aberta pelo link de "esqueci a senha": a sessão de recuperação já está ativa. */
export default async function RedefinirSenha() {
  const sessao = await exigirPerfil("usuario");

  return (
    <main className={estilos.pagina}>
      <section className={estilos.caixa} aria-labelledby="titulo">
        <p className={estilos.marca}>Portal Perfin</p>
        <h1 id="titulo">Nova senha</h1>
        <p className={estilos.subtitulo}>
          Crie a nova senha da conta <strong>{sessao.email}</strong>.
        </p>
        <FormularioNovaSenha />
      </section>
    </main>
  );
}
