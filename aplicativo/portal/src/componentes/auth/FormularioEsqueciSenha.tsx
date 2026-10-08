"use client";

import { useActionState } from "react";

import { type EstadoEsqueciSenha, pedirNovaSenha } from "@/app/login/acoes";
import { esquemaEsqueciSenha } from "@/dominio/auth/cadastro";

import estilos from "./auth.module.css";
import { useValidacao } from "./useValidacao";

const INICIAL: EstadoEsqueciSenha = { erro: null, enviado: false };
const CAMPOS = ["email"] as const;

/** Pede o link para criar uma nova senha. A resposta não revela se o e-mail existe. */
export default function FormularioEsqueciSenha() {
  const [estado, acao, enviando] = useActionState(pedirNovaSenha, INICIAL);
  const { erroLocal, aoEnviar } = useValidacao(esquemaEsqueciSenha, CAMPOS);
  const erro = erroLocal ?? estado.erro;

  return (
    <>
      <div aria-live="polite">
        {estado.enviado && (
          <div className={estilos.confirmacao}>
            <p>Se houver uma conta com este e-mail, enviamos um link.</p>
            <p className={estilos.dica}>Não chegou? Veja a caixa de spam ou tente de novo em alguns minutos.</p>
          </div>
        )}
      </div>

      {!estado.enviado && (
        <form action={acao} onSubmit={aoEnviar} className={estilos.formulario} noValidate>
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
          {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
          <button type="submit" className={estilos.botaoEscuro} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      )}
    </>
  );
}
