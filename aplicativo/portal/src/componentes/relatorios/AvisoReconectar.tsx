import type { DestinoConectar } from "@/dominio/auth/conectar";

import BotaoGoogle from "../auth/BotaoGoogle";
import ui from "../ui/ui.module.css";

/** Pede para conectar a conta Google (Agenda, Drive e Gmail) quando não há autorização válida. */
export default function AvisoReconectar({ destino }: { destino: DestinoConectar }) {
  return (
    <div className={ui.secao}>
      <p className={ui.aviso_legal}>
        Para usar a Agenda e os relatórios, autorize o acesso à sua conta Google (Agenda, Drive e Gmail — o Portal
        só cria rascunhos, nunca envia).
      </p>
      <BotaoGoogle rotulo="Conectar conta Google" claro modo="conectar" destino={destino} />
    </div>
  );
}
