"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type EstadoCadastro, cadastrarComSenha } from "@/app/login/acoes";
import { esquemaCadastro } from "@/dominio/auth/cadastro";

import estilos from "./auth.module.css";
import { useValidacao } from "./useValidacao";

const INICIAL: EstadoCadastro = { erro: null, enviadoPara: null };
const CAMPOS = ["nome", "email", "senha", "confirmacao"] as const;

/** Cadastro por e-mail e senha. Depois de criar, pede para confirmar o e-mail. */
export default function FormularioCadastro() {
  const [estado, acao, enviando] = useActionState(cadastrarComSenha, INICIAL);
  const { erroLocal, aoEnviar } = useValidacao(esquemaCadastro, CAMPOS);
  const erro = erroLocal ?? estado.erro;

  return (
    <>
      <div aria-live="polite">
        {estado.enviadoPara && (
          <div className={estilos.confirmacao}>
            <h2>Confira seu e-mail</h2>
            <p>
              Enviamos um link de confirmação para <strong>{estado.enviadoPara}</strong>. Clique nele para ativar a
              conta e entrar no Portal.
            </p>
            <p className={estilos.dica}>Não chegou? Veja a caixa de spam ou use o Google.</p>
          </div>
        )}
      </div>

      {!estado.enviadoPara && (
        <form action={acao} onSubmit={aoEnviar} className={estilos.formulario} noValidate>
          <label htmlFor="nome">Nome</label>
          <input id="nome" name="nome" type="text" autoComplete="name" required maxLength={100} defaultValue={estado.nome} />
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={estado.email} />
          <label htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" autoComplete="new-password" required aria-describedby="dica-senha" />
          <p id="dica-senha" className={estilos.dica}>12 caracteres ou mais, com letras e números.</p>
          <label htmlFor="confirmacao">Confirme a senha</label>
          <input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required />
          {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
          <p className={estilos.dica}>
            Ao criar a conta você concorda com a <Link href="/privacidade">Política de Privacidade</Link>.
          </p>
          <button type="submit" className={estilos.botaoEscuro} disabled={enviando}>
            {enviando ? "Criando conta…" : "Criar conta"}
          </button>
        </form>
      )}
    </>
  );
}
