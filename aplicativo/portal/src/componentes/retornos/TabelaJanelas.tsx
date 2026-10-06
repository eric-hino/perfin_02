import Link from "next/link";

import { formatarData } from "@/dominio/datas";
import { formatarFracaoPct, sinalDe } from "@/dominio/formatacao";
import { rotuloJanela } from "@/dominio/retornos/janelas";
import type { ModoRetorno } from "@/dominio/retornos/retornos";
import type { LinhaJanelas } from "@/dominio/retornos/tabela";
import type { Indicador } from "@/dominio/series";

import ui from "../ui/ui.module.css";
import estilos from "./tabelaJanelas.module.css";

interface Props {
  linhas: (LinhaJanelas & { indicador: Indicador })[];
  modo: ModoRetorno;
  referencia: string;
  /** Monta o link que aplica a janela ao gráfico. */
  baseQuery: string;
}

/** Matriz indicador × janela. Clicar numa célula aplica a janela ao gráfico. */
export default function TabelaJanelas({ linhas, modo, referencia, baseQuery }: Props) {
  if (!linhas.length) return null;
  const janelas = linhas[0].celulas.map((c) => c.janela);
  const formatar = (v: number | null) => (modo === "pct_cdi" ? formatarFracaoPct(v, 0) : formatarFracaoPct(v, 2, true));

  return (
    <div className={ui.rolagem}>
      <table className={ui.tabela}>
        <caption className="visualmente-oculto">Retorno por janela até {formatarData(referencia)}</caption>
        <thead>
          <tr>
            <th scope="col">Indicador</th>
            {janelas.map((j) => <th key={j} scope="col" className={ui.num}>{rotuloJanela(j)}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.codigo}>
              <th scope="row">{l.indicador.nomeCurto}</th>
              {l.celulas.map((c) => (
                <td key={c.janela} className={ui.num}>
                  <Link href={`/retornos?${baseQuery}&janela=${c.janela}`} className={`${estilos.celula} ${sinalDe(c.retorno)}`}
                    title={`${formatarData(c.de)} a ${formatarData(c.ate)}`} scroll={false}>
                    {formatar(c.retorno)}
                  </Link>
                  {c.anualizado !== null && <span className={estilos.anual}>{formatarFracaoPct(c.anualizado, 1)} a.a.</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
