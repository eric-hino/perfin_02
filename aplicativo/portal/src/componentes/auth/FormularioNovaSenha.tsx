"use client";

import { useActionState } from "react";

import { type EstadoFormulario, redefinirSenha } from "@/app/login/acoes";
import { esquemaNovaSenha } from "@/dominio/auth/cadastro";

import estilos from "./auth.module.css";
import { useValidacao } from "./useValidacao";

const INICIAL: EstadoFormulario = { erro: null };
const CAMPOS = ["senha", "confirmacao"] as const;

/** Nova senha e confirmação (depois do link de "esqueci a senha"). */
export default function FormularioNovaSenha() {
  const [estado, acao, enviando] = useActionState(redefinirSenha, INICIAL);
  const { erroLocal, aoEnviar } = useValidacao(esquemaNovaSenha, CAMPOS);
  const erro = erroLocal ?? estado.erro;

  return (
    <form action={acao} onSubmit={aoEnviar} className={estilos.formulario} noValidate>
      <label htmlFor="senha">Nova senha</label>
      <input id="senha" name="senha" type="password" autoComplete="new-password" required aria-describedby="dica-senha" />
      <p id="dica-senha" className={estilos.dica}>12 caracteres ou mais, com letras e números.</p>
      <label htmlFor="confirmacao">Confirme a nova senha</label>
      <input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required />
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
      <button type="submit" className={estilos.botaoEscuro} disabled={enviando}>
        {enviando ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
