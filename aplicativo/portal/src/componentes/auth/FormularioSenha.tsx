"use client";

import { useActionState } from "react";

import { type EstadoLoginSenha, entrarComSenha } from "@/app/login/acoes";

import estilos from "./auth.module.css";

const INICIAL: EstadoLoginSenha = { erro: null };

export default function FormularioSenha() {
  const [estado, acao, enviando] = useActionState(entrarComSenha, INICIAL);

  return (
    <form action={acao} className={estilos.formulario}>
      <label htmlFor="email">E-mail</label>
      <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
      <label htmlFor="senha">Senha</label>
      <input id="senha" name="senha" type="password" autoComplete="current-password" required maxLength={200} />
      {estado.erro && <p role="alert" className={estilos.erro}>{estado.erro}</p>}
      <button type="submit" className={estilos.botaoEscuro} disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
