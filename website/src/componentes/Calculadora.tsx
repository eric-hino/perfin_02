"use client";

import { useActionState } from "react";

import { type EstadoCalculadora, calcular } from "@/app/acoes";

import estilos from "./site.module.css";

const INICIAL: EstadoCalculadora = { erro: null, resultado: null };

/** Corrige um valor por IPCA ou IGP-M entre dois meses (inclusive). */
export default function Calculadora() {
  const [estado, acao, calculando] = useActionState(calcular, INICIAL);
  return (
    <form action={acao} className={estilos.formulario}>
      <label>Índice
        <select name="indice" defaultValue="ipca">
          <option value="ipca">IPCA</option>
          <option value="igpm">IGP-M</option>
        </select>
      </label>
      <label>Mês inicial<input name="mesInicial" type="month" min="2000-01" required defaultValue="2020-01" /></label>
      <label>Mês final<input name="mesFinal" type="month" min="2000-01" required /></label>
      <label>Valor (R$)<input name="valor" inputMode="decimal" required defaultValue="1.000,00" maxLength={20} /></label>
      <button type="submit" disabled={calculando}>{calculando ? "Calculando…" : "Corrigir valor"}</button>
      {estado.erro && <p role="alert" className={estilos.erro}>{estado.erro}</p>}
      {estado.resultado && (
        <p aria-live="polite" className={estilos.resultado}>
          Valor corrigido: <strong>{estado.resultado.valor}</strong><br />
          Fator {estado.resultado.fator} · variação de {estado.resultado.variacao} em {estado.resultado.meses} meses
        </p>
      )}
    </form>
  );
}
