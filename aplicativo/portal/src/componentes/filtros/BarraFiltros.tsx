"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { GRANULARIDADES } from "@/dominio/agregacao";
import { hojeEmSaoPaulo } from "@/dominio/datas";
import { JANELAS } from "@/dominio/retornos/janelas";
import { MODOS } from "@/dominio/retornos/retornos";

import estilos from "./filtros.module.css";

interface Props {
  referencia: string;
  janela: string;
  modo: string;
  granularidade: string;
  mostrar?: { modo?: boolean; granularidade?: boolean };
}

/** Filtros globais (data de referência, janela, modo e granularidade), guardados na URL. */
export default function BarraFiltros({ referencia, janela, modo, granularidade, mostrar = {} }: Props) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();

  const mudar = (mudancas: Record<string, string | null>) => {
    const novo = new URLSearchParams(parametros.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === null || valor === "") novo.delete(chave);
      else novo.set(chave, valor);
    }
    if (mudancas.janela && mudancas.janela !== "personalizada") novo.delete("de");
    iniciar(() => router.push(`${caminho}?${novo.toString()}`, { scroll: false }));
  };

  return (
    <div className={estilos.barra} aria-busy={pendente}>
      <div className={estilos.janelas} role="group" aria-label="Janela de análise">
        {JANELAS.map((j) => (
          <button key={j.valor} type="button" aria-pressed={janela === j.valor} className={estilos.chip}
            onClick={() => mudar({ janela: j.valor })}>
            {j.rotulo}
          </button>
        ))}
      </div>
      <div className={estilos.campos}>
        <label>Data de referência
          <input type="date" value={referencia} max={hojeEmSaoPaulo()} min="2000-01-03"
            onChange={(e) => e.target.value && mudar({ ref: e.target.value })} />
        </label>
        {mostrar.modo !== false && (
          <label>Modo de retorno
            <select value={modo} onChange={(e) => mudar({ modo: e.target.value === "nominal" ? null : e.target.value })}>
              {MODOS.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
            </select>
          </label>
        )}
        {mostrar.granularidade && (
          <label>Granularidade
            <select value={granularidade} onChange={(e) => mudar({ gran: e.target.value === "mensal" ? null : e.target.value })}>
              {GRANULARIDADES.map((g) => <option key={g.valor} value={g.valor}>{g.rotulo}</option>)}
            </select>
          </label>
        )}
        {pendente && <span className={estilos.status} role="status">Atualizando…</span>}
      </div>
    </div>
  );
}
