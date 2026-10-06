"use client";

import { useActionState } from "react";

import { type EstadoAcao, alterarUsuarioAcao, removerUsuarioAcao } from "@/app/(portal)/admin/acoes";

import estilos from "../relatorios/relatorios.module.css";

const INICIAL: EstadoAcao = { erro: null, sucesso: null };

interface Props {
  email: string;
  papel: "admin" | "usuario";
  ativo: boolean;
}

/** Ações de uma linha da lista de usuários (o admin principal não recebe ações). */
export default function AcoesUsuario({ email, papel, ativo }: Props) {
  const [estadoAlterar, alterar, alterando] = useActionState(alterarUsuarioAcao, INICIAL);
  const [estadoRemover, remover, removendo] = useActionState(removerUsuarioAcao, INICIAL);
  const erro = estadoAlterar.erro ?? estadoRemover.erro;

  return (
    <div className={estilos.acoes}>
      <form action={alterar}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="campo" value="papel" />
        <input type="hidden" name="valor" value={papel === "admin" ? "usuario" : "admin"} />
        <button type="submit" className={estilos.link} disabled={alterando}>
          {papel === "admin" ? "Tornar usuário" : "Tornar administrador"}
        </button>
      </form>
      <form action={alterar}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="campo" value="ativo" />
        <input type="hidden" name="valor" value={ativo ? "false" : "true"} />
        <button type="submit" className={estilos.link} disabled={alterando}>{ativo ? "Desativar" : "Reativar"}</button>
      </form>
      <form action={remover} onSubmit={(e) => { if (!confirm(`Remover ${email} da lista de acesso?`)) e.preventDefault(); }}>
        <input type="hidden" name="email" value={email} />
        <button type="submit" className={estilos.link} disabled={removendo}>Remover</button>
      </form>
      {erro && <span role="alert" className="negativo">{erro}</span>}
    </div>
  );
}
