# Insights automáticos

Código: `aplicativo/portal/src/dominio/insights/`.
- São regras determinísticas, sem IA. Os limiares ficam no parâmetro `limiares_insights`, editável em Admin → Parâmetros.
- Cada insight tem severidade (alerta, atenção ou informativo), título, texto, indicador e valor.
- A lista é ordenada por severidade.

| # | Regra | Quando aparece | Severidade |
|---|---|---|---|
| 1 | IPCA 12m e a meta | Sempre que há 12 meses: acima do teto, abaixo do piso ou dentro, e há quantos meses | alerta fora da banda; informativo dentro |
| 2 | Ritmo da inflação | \|3m anualizado − 12m\| ≥ `aceleracao_pp` | atenção (acelerando) / informativo |
| 3 | IGP-M × IPCA | \|IGP-M 12m − IPCA 12m\| ≥ `descolamento_igpm_ipca_pp` | atenção |
| 4 | Juro real ex-post | ≥ `juro_real_restritivo_pct` ou ≤ `juro_real_expansionista_pct` | informativo |
| 5 | Decisão do Copom | A Selic meta mudou no mês da referência | informativo |
| 6 | Copom precificado | Há reuniões cadastradas: corte, alta ou manutenção precificada na próxima, e Selic implícita no fim do ano | informativo |
| 7 | A curva mudou | Selic implícita no fim do ano ou IPCA implícito em 12m variou ≥ `mudanca_curva_pp` contra a curva de ~1 semana antes | atenção |
| 8 | Inflação implícita | IPCA implícito em 12 meses fora da banda da meta | atenção |
| 9 | Juro real do IMA-B | Máxima ou mínima em `meses_extremo` meses, ou ≥ `yield_imab_alto_pct` | atenção se alto |
| 10 | Ibovespa × CDI | Sempre que há 12 meses de dados; acrescenta o drawdown se a queda desde o pico for ≥ `drawdown_ibovespa_pct` | atenção em queda |
| 11 | Câmbio | Variação no mês ≥ `dolar_variacao_mes_pct`, extremo em `meses_extremo` meses, ou volatilidade do mês > 1,25 × a de 12 meses | atenção se a variação passar do limiar |
| 12 | Investimento | IDP 12m caindo pelo 3º mês seguido; se não, FBCF real contra o ano anterior | atenção / informativo |
| 13 | Ranking da janela | Indicador que lidera e o último na janela filtrada, no modo ativo | informativo |
| 14 | Recorde do IPCA | IPCA mensal o maior em ao menos 24 meses | atenção |

**Onde aparecem:**
- na Visão geral (Destaques);
- na aba Resumo do relatório;
- no e-mail do rascunho: 3 a 5 destaques, incluindo 1 de projeção quando houver;
- no contexto do assistente.
