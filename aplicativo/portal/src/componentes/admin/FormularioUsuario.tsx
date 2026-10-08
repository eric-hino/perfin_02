"use client";

import { useActionState } from "react";

import { type EstadoAcao, incluirUsuarioAcao } from "@/app/(portal)/admin/acoes";

import estilos from "../graficos/graficos.module.css";
import ui from "../ui/ui.module.css";

const INICIAL: EstadoAcao = { erro: null, sucesso: null };

/** Pré-cadastra um e-mail para definir o papel antes do primeiro acesso. */
export default function FormularioUsuario() {
  const [estado, acao, enviando] = useActionState(incluirUsuarioAcao, INICIAL);
  return (
    <form action={acao} className={ui.secao}>
      <p className={ui.subtitulo}>
        Qualquer pessoa pode se cadastrar no Portal e entra como usuário. Inclua um e-mail aqui só para já
        definir o papel (por exemplo, administrador) antes do primeiro acesso.
      </p>
      <div className={estilos.controles}>
        <label>Nome (opcional)
          <input name="nome" type="text" maxLength={100} autoComplete="off" />
        </label>
        <label>E-mail
          <input name="email" type="email" required maxLength={254} placeholder="nome@exemplo.com" />
        </label>
        <label>Papel
          <select name="papel" defaultValue="usuario">
            <option value="usuario">Usuário</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button type="submit" className={ui.botaoPrimario} disabled={enviando}>Incluir</button>
      </div>
      {estado.erro && <p role="alert" className="negativo">{estado.erro}</p>}
      {estado.sucesso && <p role="status">{estado.sucesso}</p>}
    </form>
  );
}
