"use client";

import { useActionState } from "react";

import { type EstadoAcao, salvarParametrosAcao } from "@/app/(portal)/admin/acoes";
import type { Limiares } from "@/dominio/insights/tipos";
import type { MetaInflacao } from "@/dominio/inflacao";

import estilos from "../graficos/graficos.module.css";
import ui from "../ui/ui.module.css";

const INICIAL: EstadoAcao = { erro: null, sucesso: null };

const ROTULOS: Record<keyof Limiares, string> = {
  aceleracao_pp: "Aceleração da inflação (p.p.)",
  descolamento_igpm_ipca_pp: "Descolamento IGP-M × IPCA (p.p.)",
  juro_real_restritivo_pct: "Juro real restritivo a partir de (%)",
  juro_real_expansionista_pct: "Juro real expansionista até (%)",
  dolar_variacao_mes_pct: "Variação do dólar no mês (%)",
  drawdown_ibovespa_pct: "Queda do Ibovespa desde o pico (%)",
  mudanca_curva_pp: "Mudança da curva na semana (p.p.)",
  yield_imab_alto_pct: "Juro real do IMA-B alto a partir de (%)",
  meses_extremo: "Janela de máximas e mínimas (meses)",
};

interface Props {
  meta: MetaInflacao;
  limiares: Limiares;
  reunioesCopom: string[];
}

/** Meta de inflação, limiares dos insights e calendário do Copom. */
export default function FormularioParametros({ meta, limiares, reunioesCopom }: Props) {
  const [estado, acao, salvando] = useActionState(salvarParametrosAcao, INICIAL);
  return (
    <form action={acao} className={ui.secao}>
      <h2>Meta de inflação</h2>
      <div className={estilos.controles}>
        <label>Centro (%)<input name="centro" inputMode="decimal" defaultValue={String(meta.centro)} required /></label>
        <label>Tolerância (p.p.)<input name="tolerancia" inputMode="decimal" defaultValue={String(meta.tolerancia)} required /></label>
      </div>
      <h2>Limiares dos insights</h2>
      <div className={estilos.controles}>
        {(Object.keys(ROTULOS) as (keyof Limiares)[]).map((chave) => (
          <label key={chave}>{ROTULOS[chave]}
            <input name={chave} inputMode="decimal" defaultValue={String(limiares[chave])} required />
          </label>
        ))}
      </div>
      <h2>Reuniões do Copom</h2>
      <label className={estilos.dica}>Uma data por linha (AAAA-MM-DD), data da decisão
        <textarea name="copom" rows={6} defaultValue={reunioesCopom.join("\n")} />
      </label>
      <button type="submit" className={ui.botaoPrimario} disabled={salvando}>{salvando ? "Salvando…" : "Salvar parâmetros"}</button>
      {estado.erro && <p role="alert" className="negativo">{estado.erro}</p>}
      {estado.sucesso && <p role="status">{estado.sucesso}</p>}
    </form>
  );
}
