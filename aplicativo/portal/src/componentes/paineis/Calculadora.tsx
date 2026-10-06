"use client";

import { useActionState } from "react";

import { type EstadoCorrecao, calcularCorrecao } from "@/app/(portal)/inflacao/acoes";

import estilos from "../graficos/graficos.module.css";
import ui from "../ui/ui.module.css";

const INICIAL: EstadoCorrecao = { erro: null, resultado: null };

/** Calculadora de correção monetária por IPCA ou IGP-M (mês inicial ao final, inclusive). */
export default function Calculadora({ ultimoMes }: { ultimoMes: string }) {
  const [estado, acao, calculando] = useActionState(calcularCorrecao, INICIAL);

  return (
    <form action={acao} className={ui.secao}>
      <div className={estilos.controles}>
        <label>Índice
          <select name="indice" defaultValue="ipca">
            <option value="ipca">IPCA</option>
            <option value="igpm">IGP-M</option>
          </select>
        </label>
        <label>Mês inicial
          <input name="mesInicial" type="month" required min="2000-01" max={ultimoMes} defaultValue="2020-01" />
        </label>
        <label>Mês final
          <input name="mesFinal" type="month" required min="2000-01" max={ultimoMes} defaultValue={ultimoMes} />
        </label>
        <label>Valor (R$)
          <input name="valor" inputMode="decimal" required defaultValue="1.000,00" maxLength={20} />
        </label>
        <button type="submit" className={ui.botaoPrimario} disabled={calculando}>{calculando ? "Calculando…" : "Corrigir"}</button>
      </div>
      {estado.erro && <p role="alert" className="negativo">{estado.erro}</p>}
      {estado.resultado && (
        <p aria-live="polite">
          Valor corrigido: <strong className="numero">{estado.resultado.valor}</strong> · fator {estado.resultado.fator} ·
          variação de {estado.resultado.variacao} em {estado.resultado.meses} meses.
        </p>
      )}
    </form>
  );
}
