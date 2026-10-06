// Texto da aba "Metodologia" do relatório.

export const METODOLOGIA: readonly (readonly [string, string])[] = [
  ["Tema", "Como é calculado"],
  ["Fontes", "BCB/SGS (CDI 12, Selic over 11, Selic meta 432, IPCA 433, IGP-M 189, PTAX 1, IDP 22885); IBGE/SIDRA 1846 (FBCF); B3 (Ibovespa e curvas do arquivo Taxas de Mercado para Swaps); ANBIMA (IMA-B: número-índice, taxa indicativa e duration)."],
  ["Defasagem de divulgação", "IPCA ~10 dias após o mês; IGP-M no fim do mês; IDP ~25 dias após o mês; FBCF ~60 dias após o trimestre; PTAX, CDI, Ibovespa, IMA-B e curvas no mesmo dia útil."],
  ["Acumulados", "Composição: (Π(1 + taxa/100) − 1) × 100. Inflação e CDI no mês, no ano e em 12 meses."],
  ["Retorno entre datas", "R = I(fim)/I(início) − 1, com o último valor disponível em cada data (dias sem pregão usam o anterior)."],
  ["Pro rata do IPCA/IGP-M", "Em datas quebradas: I(d) = I(fim do mês anterior) × (1 + taxa do mês)^(dia/dias do mês)."],
  ["Modos", "Real: (1 + R)/(1 + R_IPCA) − 1. Excesso sobre o CDI: (1 + R)/(1 + R_CDI) − 1. % do CDI: R/R_CDI."],
  ["Anualização", "(1 + R)^(252/dias úteis) − 1, calendário de feriados nacionais (padrão ANBIMA)."],
  ["Juro real ex-post", "((1 + CDI 12m)/(1 + IPCA 12m) − 1) × 100."],
  ["Volatilidade", "Desvio-padrão dos log-retornos diários × √252."],
  ["Curvas e projeções", "Interpolação flat-forward exponencial em base 252. Taxa a termo: ((1 + r2)^(du2/252)/(1 + r1)^(du1/252))^(252/(du2 − du1)) − 1."],
  ["CDI e Selic implícitos", "CDI: taxa a termo da curva DI × Pré. Selic: taxa a termo entre reuniões do Copom + diferença recente Selic meta − CDI."],
  ["Inflação implícita", "(1 + pré)/(1 + cupom de IPCA) − 1 por vértice (DI × IPCA); média implícita, sem sazonalidade."],
  ["Dólar futuro", "Paridade coberta: PTAX × (1 + pré)^(du/252)/(1 + cupom cambial × dc/360)."],
  ["IMA-B carrego", "(1 + yield real)^(du/252) × (1 + IPCA implícito) − 1, supondo taxa constante."],
  ["Ibovespa", "Sem projeção: o índice futuro embute apenas o custo de carregamento (CDI), não uma expectativa."],
  ["FBCF real", "Aproximação: variação nominal contra o mesmo trimestre do ano anterior deflacionada pelo IPCA de 12 meses."],
  ["Aviso", "Taxas de mercado embutem prêmios de risco; não são previsão nem recomendação de investimento."],
];
