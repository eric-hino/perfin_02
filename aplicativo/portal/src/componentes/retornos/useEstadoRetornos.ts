"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ehDataISO } from "@/dominio/datas";

import type { DadosGraficoRetornos, Janela } from "./tipos";

/** Atualiza a URL sem nova navegação (os filtros continuam compartilháveis por link). */
function sincronizarUrl(janela: Janela, selecionadas: string[], projecoes: boolean) {
  const url = new URL(window.location.href);
  url.searchParams.set("janela", "personalizada");
  url.searchParams.set("de", janela.de);
  url.searchParams.set("ref", janela.ate);
  url.searchParams.set("series", selecionadas.join(","));
  if (projecoes) url.searchParams.set("proj", "1");
  else url.searchParams.delete("proj");
  window.history.replaceState(window.history.state, "", url);
}

/** Estado do gráfico de retornos: janela visível, seleção por arrasto, séries e projeções. */
export function useEstadoRetornos(dados: DadosGraficoRetornos) {
  const [janela, setJanela] = useState<Janela>(dados.janelaInicial);
  const [selecao, setSelecao] = useState<Janela | null>(null);
  const [selecionadas, setSelecionadas] = useState<string[]>(dados.selecionadas);
  const [projecoes, setProjecoes] = useState(dados.projecoesLigadas);
  const pendente = useRef<Janela | null>(null);
  const quadro = useRef<number | null>(null);
  const selecaoPendente = useRef<{ valor: Janela | null; quadro: number | null }>({ valor: null, quadro: null });

  const aplicarJanela = useCallback((nova: Janela) => {
    setJanela((atual) => (atual.de === nova.de && atual.ate === nova.ate ? atual : nova));
    sincronizarUrl(nova, selecionadas, projecoes);
  }, [selecionadas, projecoes]);

  // Zoom e arrasto disparam muitos eventos: aplica no máximo um por quadro.
  const aoMudarJanela = useCallback((nova: Janela) => {
    const agendado = pendente.current !== null;
    pendente.current = nova;
    if (agendado) return;
    quadro.current = requestAnimationFrame(() => {
      quadro.current = null;
      const valor = pendente.current;
      pendente.current = null;
      if (valor) aplicarJanela(valor);
    });
  }, [aplicarJanela]);

  // O arrasto da seleção dispara um evento por movimento do mouse: um por quadro basta.
  const aoSelecionar = useCallback((nova: Janela | null) => {
    const fila = selecaoPendente.current;
    fila.valor = nova;
    if (fila.quadro !== null) return;
    fila.quadro = requestAnimationFrame(() => {
      fila.quadro = null;
      setSelecao(fila.valor);
    });
  }, []);

  // Desmontou com quadro pendente: cancela para não mexer na URL de outra página.
  useEffect(() => {
    const fila = selecaoPendente.current;
    return () => {
      if (quadro.current !== null) cancelAnimationFrame(quadro.current);
      if (fila.quadro !== null) cancelAnimationFrame(fila.quadro);
    };
  }, []);

  useEffect(() => {
    if (!selecao) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === "Escape") setSelecao(null); };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [selecao]);

  return {
    janela, selecao, selecionadas, projecoes, aoMudarJanela, aoSelecionar,
    limparSelecao: () => setSelecao(null),
    alternarSerie: (codigo: string) => {
      const novas = selecionadas.includes(codigo) ? selecionadas.filter((c) => c !== codigo) : [...selecionadas, codigo];
      setSelecionadas(novas);
      sincronizarUrl(janela, novas, projecoes);
    },
    mudarData: (campo: keyof Janela, valor: string) => {
      if (!ehDataISO(valor)) return;
      const nova = { ...janela, [campo]: valor };
      if (nova.de < nova.ate) aplicarJanela(nova);
    },
    mudarProjecoes: (ligado: boolean) => {
      setProjecoes(ligado);
      sincronizarUrl(janela, selecionadas, ligado);
    },
    ampliar: () => {
      if (!selecao) return;
      aplicarJanela(selecao);
      setSelecao(null);
    },
  };
}
