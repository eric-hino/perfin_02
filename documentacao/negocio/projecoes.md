# Projeções implícitas nos preços de mercado

Código: `aplicativo/portal/src/dominio/projecoes/`. As projeções usam as curvas do **último dia útil coletado** até a data de referência. A data da curva aparece sempre na tela.

## Método

- **Interpolação flat-forward exponencial** em base 252 (`curva.ts`):
  - entre vértices, `F(du) = F_a × (F_b/F_a)^((du − du_a)/(du_b − du_a))`, com `F = (1 + r)^(du/252)`;
  - antes do primeiro vértice usa a taxa dele;
  - depois do último, estende a última taxa a termo.
- **Taxa a termo:** `((1 + r₂)^(du₂/252)/(1 + r₁)^(du₁/252))^(252/(du₂ − du₁)) − 1`.
- Os dias úteis são contados pelo calendário de `feriados`, no intervalo (data-base, data].

## Por indicador (`projecoes.ts`)

| Indicador | Como é projetado |
|---|---|
| CDI | Taxa a termo da curva DI × Pré em cada mês (só a parte do mês depois da data-base) |
| Selic meta | Taxa a termo entre reuniões do Copom (parâmetro `copom_reunioes`) + diferença média dos últimos 21 dias úteis entre a Selic meta e o CDI anualizado. Sem reuniões cadastradas, usa os fins de mês |
| IPCA | Inflação implícita por vértice `(1 + pré)/(1 + DI×IPCA) − 1`, depois a termo mensal. É uma média implícita, sem sazonalidade |
| IGP-M | Igual ao IPCA com a curva DI × IGP-M, só se ela tiver ao menos 4 vértices até 2 anos. Se não tiver, a tela diz "sem projeção de mercado" |
| Dólar | Paridade coberta: `PTAX × (1 + pré)^(du/252) / (1 + cupom × dc/360)`, com o cupom interpolado linearmente por dias corridos |
| IMA-B | Carrego: `(1 + yield real)^(du/252) × (1 + IPCA implícito) − 1`, supondo a taxa constante |
| Ibovespa | Sem projeção: o índice futuro só embute o custo de carregamento (CDI), não uma expectativa |
| IDP e FBCF | Sem ativo negociado, logo sem projeção |

## Na tela

- **Gráfico de retornos:** com "Projeções: Ligadas", a linha continua tracejada após a última data realizada. Isso vale só no modo nominal.
  - O índice projetado é encadeado a partir do último valor realizado (`encadear.ts`).
  - Para séries mensais com meses ainda não divulgados (por exemplo, o IPCA), esses meses e o mês da data-base usam a primeira taxa de mês cheio da projeção.
- **Tabelas de horizontes:**
  - horizontes de 3, 6, 12 e 24 meses, fim deste ano e fim do ano que vem;
  - mostram CDI acumulado, Selic implícita (taxa a termo de 21 du no horizonte + spread), IPCA e IGP-M implícitos, dólar futuro e carrego do IMA-B;
  - embaixo de cada valor, a mudança em relação à curva de ~1 mês antes ("como a projeção mudou"), calculada nas mesmas datas-alvo.
- **Painel de Juros:** curva DI × Pré de hoje, de 1 semana e de 1 mês antes.
- **Aviso fixo:** "Taxas de mercado embutem prêmios de risco; não são previsão nem recomendação."
