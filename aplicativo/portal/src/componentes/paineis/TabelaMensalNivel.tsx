import { fimDoMes, formatarMes, inicioDoMes, somarDias, somarMeses } from "@/dominio/datas";
import { resumoDoMes } from "@/dominio/estatisticas";
import { formatarNumero, formatarPct, sinalDe } from "@/dominio/formatacao";
import { type Ponto, valorAsOf } from "@/dominio/series";

import ui from "../ui/ui.module.css";

interface Props {
  pontos: readonly Ponto[];
  ate: string;
  casas: number;
  meses?: number;
}

/** Fechamento, média, mínimo, máximo e variação de cada mês (séries de nível). */
export default function TabelaMensalNivel({ pontos, ate, casas, meses = 12 }: Props) {
  const linhas = Array.from({ length: meses }, (_, k) => inicioDoMes(somarMeses(ate, -k))).map((mes) => {
    const r = resumoDoMes(pontos, mes, fimDoMes(mes));
    const antes = valorAsOf(pontos, somarDias(mes, -1));
    return { mes, r, variacao: r && antes ? (r.fechamento / antes - 1) * 100 : null };
  });
  return (
    <div className={ui.rolagem}>
      <table className={ui.tabela}>
        <thead>
          <tr>
            <th scope="col">Mês</th><th scope="col" className={ui.num}>Fechamento</th><th scope="col" className={ui.num}>Média</th>
            <th scope="col" className={ui.num}>Mínimo</th><th scope="col" className={ui.num}>Máximo</th><th scope="col" className={ui.num}>Variação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ mes, r, variacao }) => (
            <tr key={mes}>
              <th scope="row">{formatarMes(mes)}</th>
              <td className={ui.num}>{formatarNumero(r?.fechamento, casas)}</td>
              <td className={ui.num}>{formatarNumero(r?.media, casas)}</td>
              <td className={ui.num}>{formatarNumero(r?.minimo, casas)}</td>
              <td className={ui.num}>{formatarNumero(r?.maximo, casas)}</td>
              <td className={`${ui.num} ${sinalDe(variacao)}`}>{formatarPct(variacao, 2, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
