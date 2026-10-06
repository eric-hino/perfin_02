"use client";

import { useActionState } from "react";

import { type EstadoAcao, incluirUsuarioAcao } from "@/app/(portal)/admin/acoes";

import estilos from "../graficos/graficos.module.css";
import ui from "../ui/ui.module.css";

const INICIAL: EstadoAcao = { erro: null, sucesso: null };

/** Inclui um e-mail Google na lista de acesso. */
export default function FormularioUsuario() {
  const [estado, acao, enviando] = useActionState(incluirUsuarioAcao, INICIAL);
  return (
    <form action={acao} className={ui.secao}>
      <div className={estilos.controles}>
        <label>E-mail Google
          <input name="email" type="email" required maxLength={254} placeholder="nome@gmail.com" />
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
