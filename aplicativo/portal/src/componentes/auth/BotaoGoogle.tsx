import { conectarGoogle, entrarComGoogle } from "@/app/login/acoesGoogle";
import type { DestinoConectar } from "@/dominio/auth/conectar";

import estilos from "./auth.module.css";

type Props = { rotulo: string; claro?: boolean } & (
  | { modo?: "entrar"; destino?: never }
  | { modo: "conectar"; destino: DestinoConectar }
);

/**
 * Botão do Google. "entrar": login/cadastro só com a identidade.
 * "conectar": autoriza Agenda, Drive e Gmail e volta para o destino.
 */
export default function BotaoGoogle({ rotulo, claro = false, modo = "entrar", destino }: Props) {
  return (
    <form action={modo === "conectar" ? conectarGoogle : entrarComGoogle}>
      {modo === "conectar" && <input type="hidden" name="destino" value={destino} />}
      <button type="submit" className={claro ? estilos.botaoClaro : estilos.botaoEscuro}>
        {rotulo}
      </button>
    </form>
  );
}
