import type { DataISO } from "@/dominio/datas";
import type { PontoProjetado } from "@/dominio/projecoes/projecoes";
import type { ModoRetorno } from "@/dominio/retornos/retornos";
import type { Indicador, Ponto } from "@/dominio/series";

/** Dados serializáveis que o servidor envia ao gráfico de retornos. */
export interface DadosGraficoRetornos {
  indicadores: Indicador[];
  pontos: Record<string, Ponto[]>;
  /** Índice projetado (mesma escala do índice realizado) por indicador. */
  projecoes: Record<string, PontoProjetado[]>;
  dataCurva: DataISO | null;
  feriados: DataISO[];
  janelaInicial: { de: DataISO; ate: DataISO };
  modo: ModoRetorno;
  selecionadas: string[];
  projecoesLigadas: boolean;
}

export interface Janela {
  de: DataISO;
  ate: DataISO;
}
