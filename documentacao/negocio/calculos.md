# Retornos, janelas e demais cálculos

Todos os cálculos estão em `aplicativo/portal/src/dominio/`, em funções puras e testadas. Painel, relatório e assistente usam as mesmas funções.

## Índice e retorno (`dominio/retornos/indice.ts`, `retornos.ts`)

- **Nível** (Ibovespa, IMA-B, dólar): `I(t) = valor(t)`. Em dia sem pregão vale o último valor anterior.
- **Taxa diária** (CDI, Selic over): `I(t) = Π(1 + r/100)` das taxas com data ≤ t. O retorno entre d1 e d2 usa as taxas de (d1, d2].
- **Taxa mensal** (IPCA, IGP-M):
  - pro rata geométrico por dias corridos: `I(d) = I(fim do mês anterior) × (1 + r)^(dia / dias do mês)`;
  - não existe depois do último mês divulgado, e a tela mostra "dados até".
- **Retorno:** `R = I(d2)/I(d1) − 1`.

## Modos

| Modo | Fórmula |
|---|---|
| Nominal | `R` |
| Real | `(1 + R)/(1 + R_IPCA) − 1` |
| Excesso sobre o CDI | `(1 + R)/(1 + R_CDI) − 1` |
| % do CDI | `R / R_CDI` (só quando o CDI do período é positivo) |
| Anualizado | `(1 + R)^(252/du) − 1`, com du contados pelo calendário de feriados |

## Janelas (`dominio/retornos/janelas.ts`)

Todas terminam na **data de referência**. Por padrão, é o último dia com CDI.

| Janela | Início |
|---|---|
| No mês | Último dia do mês anterior |
| No ano | 31/12 do ano anterior |
| 1m, 3m, 6m, 12m, 24m, 36m, 5a, 10a | Mesma data N meses antes |
| Desde o início | Primeira data disponível |
| Personalizada | Data escolhida |

- Na tabela de janelas, as janelas acima de 12 meses também aparecem anualizadas.
- **Séries com defasagem** (IPCA, IGP-M, IDP): a janela é contada a partir do último dado. Por exemplo, o "12m" do IPCA vai de setembro a agosto.
- **Modos real e de CDI:** a janela termina no último dado da série de referência.
- **Série que começou depois do início da janela:** retorno e anualização usam o prazo efetivo.
- **Janela móvel:** retorno de 12, 24 ou 36 meses em cada fim de mês dos últimos 10 anos.

## Outros cálculos

- **Inflação** (`inflacao.ts`):
  - acumulado em n meses (composto; exige meses consecutivos);
  - acumulado no ano;
  - ritmo de 3 meses anualizado, `((Π₃(1 + v))⁴ − 1)`;
  - status contra a meta (parâmetro `meta_inflacao`; padrão 3,0% ± 1,5 p.p.);
  - spread IGP-M − IPCA em 12 meses.
- **Juros** (`juros.ts`): CDI em 12 meses e juro real ex-post `(1 + CDI₁₂ₘ)/(1 + IPCA₁₂ₘ) − 1`, mês a mês.
- **Câmbio e bolsa** (`estatisticas.ts`):
  - volatilidade anualizada (desvio-padrão dos log-retornos × √252), também em janela móvel de 63 dias úteis;
  - drawdown (queda desde o pico);
  - média móvel de 21 dias úteis;
  - fechamento, média, mínimo e máximo do mês;
  - dólar real: fechamento de cada mês, datado no fim do mês, × I_IPCA(base)/I_IPCA(fim do mês).
- **Investimento** (`investimento.ts`):
  - soma móvel de 12 meses (IDP) e de 4 trimestres (FBCF);
  - IDP em R$ pela PTAX média de cada mês;
  - FBCF contra o mesmo trimestre do ano anterior, nominal e real aproximada (deflacionada pelo IPCA de 12 meses até o fim do trimestre).
- **Agregação por granularidade** (`agregacao.ts`):
  - taxas do período compõem;
  - níveis usam fechamento (com média);
  - taxas usam o último valor;
  - fluxos somam;
  - períodos cortados pelo filtro ficam marcados como parciais.
- **Correção monetária:** função SQL `corrigir_valor`, do mês inicial ao final, inclusive (convenção da Calculadora do Cidadão). Portal e site usam a mesma função.
