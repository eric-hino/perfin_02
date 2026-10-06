import { entrarComGoogle } from "@/app/login/acoes";

import estilos from "./auth.module.css";

interface Props {
  rotulo: string;
  claro?: boolean;
}

/** Botão que inicia o login (ou a reconexão) com o Google. */
export default function BotaoGoogle({ rotulo, claro = false }: Props) {
  return (
    <form action={entrarComGoogle}>
      <button type="submit" className={claro ? estilos.botaoClaro : estilos.botaoEscuro}>
        {rotulo}
      </button>
    </form>
  );
}
