import { formatarData } from "@/dominio/datas";
import { formatarNumero, formatarPct, formatarPp, sinalDe } from "@/dominio/formatacao";
import { HORIZONTES, type ValoresHorizonte } from "@/dominio/projecoes/projecoes";

import ui from "../ui/ui.module.css";

export type ColunaHorizonte = "cdi" | "selic" | "ipca" | "igpm" | "dolar" | "imab";

const COLUNAS: Record<ColunaHorizonte, { titulo: string; valor: (h: ValoresHorizonte) => number | null; fmt: (v: number | null) => string }> = {
  cdi: { titulo: "CDI acumulado", valor: (h) => h.cdiAcumulado, fmt: (v) => formatarPct(v) },
  selic: { titulo: "Selic implícita (a.a.)", valor: (h) => h.selicNoHorizonte, fmt: (v) => formatarPct(v) },
  ipca: { titulo: "IPCA implícito acumulado", valor: (h) => h.ipcaAcumulado, fmt: (v) => formatarPct(v) },
  igpm: { titulo: "IGP-M implícito acumulado", valor: (h) => h.igpmAcumulado, fmt: (v) => formatarPct(v) },
  dolar: { titulo: "Dólar futuro (R$)", valor: (h) => h.dolar, fmt: (v) => formatarNumero(v, 4) },
  imab: { titulo: "Carrego IMA-B acumulado", valor: (h) => h.imabCarrego, fmt: (v) => formatarPct(v) },
};

interface Props {
  horizontes: ValoresHorizonte[];
  colunas: ColunaHorizonte[];
  /** Mesmos horizontes calculados com a curva de 1 mês antes ("como a projeção mudou"). */
  anteriores?: ValoresHorizonte[] | null;
  dataAnterior?: string | null;
}

/** Tabela de horizontes das projeções implícitas, com a mudança em relação a 1 mês antes. */
export default function TabelaHorizontes({ horizontes, colunas, anteriores, dataAnterior }: Props) {
  const antes = new Map((anteriores ?? []).map((h) => [h.horizonte, h]));
  return (
    <div className={ui.rolagem}>
      <table className={ui.tabela}>
        <thead>
          <tr>
            <th scope="col">Horizonte</th>
            {colunas.map((c) => <th key={c} scope="col" className={ui.num}>{COLUNAS[c].titulo}</th>)}
          </tr>
        </thead>
        <tbody>
          {horizontes.map((h) => (
            <tr key={h.horizonte}>
              <th scope="row">{HORIZONTES.find((x) => x.valor === h.horizonte)?.rotulo} <span className="neutro">({formatarData(h.data)})</span></th>
              {colunas.map((c) => {
                const atual = COLUNAS[c].valor(h);
                const anterior = antes.get(h.horizonte);
                const delta = anterior && atual !== null && COLUNAS[c].valor(anterior) !== null ? atual - (COLUNAS[c].valor(anterior) as number) : null;
                return (
                  <td key={c} className={ui.num}>
                    {COLUNAS[c].fmt(atual)}
                    {delta !== null && c !== "dolar" && (
                      <span className={sinalDe(delta)} style={{ display: "block", fontSize: 10 }}>{formatarPp(delta)}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {dataAnterior && <p className={ui.fonte}>Embaixo de cada valor: mudança em relação à curva de {formatarData(dataAnterior)}.</p>}
    </div>
  );
}
