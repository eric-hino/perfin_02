"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type EstadoFormulario, entrarComSenha } from "@/app/login/acoes";
import { esquemaLogin } from "@/dominio/auth/cadastro";

import estilos from "./auth.module.css";
import { useValidacao } from "./useValidacao";

const INICIAL: EstadoFormulario = { erro: null };
const CAMPOS = ["email", "senha"] as const;

/** Login por e-mail e senha. */
export default function FormularioSenha() {
  const [estado, acao, enviando] = useActionState(entrarComSenha, INICIAL);
  const { erroLocal, aoEnviar } = useValidacao(esquemaLogin, CAMPOS);
  const erro = erroLocal ?? estado.erro;

  return (
    <form action={acao} onSubmit={aoEnviar} className={estilos.formulario} noValidate>
      <label htmlFor="email">E-mail</label>
      <input
        id="email" name="email" type="email" autoComplete="email" required maxLength={254}
        defaultValue={estado.email}
      />
      <div className={estilos.linhaRotulo}>
        <label htmlFor="senha">Senha</label>
        <Link href="/esqueci-senha" className={estilos.linkDiscreto}>Esqueci minha senha</Link>
      </div>
      <input id="senha" name="senha" type="password" autoComplete="current-password" required maxLength={200} />
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
      <button type="submit" className={estilos.botaoEscuro} disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
