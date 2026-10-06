# Indicadores e fontes

O catálogo fica na tabela `indicadores`. Os valores ficam em `indicador_valores` no **formato longo**: uma linha por indicador e data.

- Mensais são gravados no dia 1 do mês.
- Trimestrais são gravados no dia 1 do trimestre.

| Código | Indicador | Fonte | Frequência | Tipo |
|---|---|---|---|---|
| `cdi` | CDI (% a.d.) | BCB/SGS 12 | diária | taxa do período |
| `selic_over` | Selic efetiva (% a.d.) | BCB/SGS 11 | diária | taxa do período |
| `selic_meta` | Meta Selic (% a.a.) | BCB/SGS 432 | diária | taxa |
| `ipca` | IPCA (% a.m.) | BCB/SGS 433 | mensal | taxa do período |
| `igpm` | IGP-M (% a.m.) | BCB/SGS 189 | mensal | taxa do período |
| `dolar_ptax` | Dólar PTAX venda (R$/US$) | BCB/SGS 1 | diária | nível |
| `ibovespa` | Ibovespa (pontos) | B3, estatísticas públicas do índice | diária | nível |
| `imab` | IMA-B (número-índice) | ANBIMA, resultados diários do IMA | diária | nível |
| `imab_yield` | IMA-B, taxa indicativa (IPCA + % a.a.) | ANBIMA | diária | taxa |
| `imab_duration` | IMA-B, duration (dias úteis) | ANBIMA | diária | auxiliar |
| `idp` | IDP, ingressos líquidos (US$ mi) | BCB/SGS 22885 | mensal | fluxo |
| `fbcf` | FBCF (R$ mi correntes) | IBGE/SIDRA 1846 | trimestral | fluxo |

**Tipos:**
- **Taxa do período:** compõe para formar um índice.
- **Nível:** o retorno é a razão entre valores.
- **Taxa:** mostrada como nível, sem retorno.
- **Fluxo:** somado.

**Curvas de mercado:** ficam em `curvas_mercado` e vêm do arquivo público "Taxas de Mercado para Swaps" da B3 (`TaxaSwap.txt`):

| Curva | Código B3 | Convenção |
|---|---|---|
| `pre` | PRE (DI × Pré) | % a.a., base 252 |
| `ipca_real` | DIC (DI × IPCA) | % a.a., base 252 |
| `igpm_real` | DIM (DI × IGP-M) | % a.a., base 252 |
| `cupom_cambial` | DOC (cupom cambial limpo) | % a.a., linear 360 |

**Volume das curvas:**
- Para caber no banco, guardamos vértices até 10 anos.
- Os vértices são afinados: todos até 1 ano, 1 a cada 2 até 3 anos, 1 a cada 4 até 10 anos. São cerca de 130 por curva por dia.
- O histórico de curvas começa em 02/01/2024.

**Feriados:**
- Ficam em `feriados`, calculados por algoritmo no padrão ANBIMA: fixos, móveis pela Páscoa e Consciência Negra desde 2024.
- São usados para contar dias úteis.

**Indicador novo:** inclua uma linha no catálogo. Se a fonte já for suportada (`BCB_SGS`, `IBGE_SIDRA`, `B3_INDICES`), não é preciso mudar código.

**Site público:** só mostra indicadores marcados como `publico` e de fonte BCB ou IBGE. Uma restrição no banco garante isso.
