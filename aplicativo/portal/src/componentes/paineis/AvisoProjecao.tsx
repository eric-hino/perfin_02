import { formatarData } from "@/dominio/datas";

import ui from "../ui/ui.module.css";

/** Aviso fixo das projeções, com a data da curva usada. */
export default function AvisoProjecao({ dataCurva }: { dataCurva: string | null }) {
  return (
    <p className={ui.aviso_legal}>
      {dataCurva ? `Curvas B3 de ${formatarData(dataCurva)}. ` : "Sem curva de mercado disponível. "}
      Taxas de mercado embutem prêmios de risco; não são previsão nem recomendação.
    </p>
  );
}
