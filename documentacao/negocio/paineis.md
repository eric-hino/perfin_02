# Painéis do Portal

**Filtros globais** (`BarraFiltros`): janela pronta, data de referência, modo de retorno e, quando faz sentido, granularidade.
- Os filtros ficam na URL (`ref`, `janela`, `de`, `modo`, `gran`, `series`, `proj`), então um link reproduz a mesma tela.
- São validados no servidor (`dominio/filtros.ts`): valores inválidos voltam ao padrão.

Toda página trata os estados **carregando** (`loading.tsx`), **erro** (`error.tsx`, sem detalhes internos) e **vazio**.

| Página | Conteúdo |
|---|---|
| Visão geral | Destaques (insights); cartões de IPCA 12m (selo da meta), IGP-M 12m, Selic meta (+ implícita no fim do ano), CDI 12m, juro real, Ibovespa, dólar, juro real do IMA-B, IDP 12m e FBCF, com minilinha de 12 meses; última referência de cada série |
| Retornos | Gráfico de retorno acumulado, tabela de janelas e janela móvel (detalhes abaixo) |
| Inflação | IPCA × IGP-M por período (granularidade), 12 meses com a faixa da meta, spread IGP-M − IPCA, mapa de calor ano × mês do IPCA, inflação implícita (com horizontes) e calculadora de correção |
| Juros | Selic meta em degraus com a Selic implícita, curva DI × Pré (hoje, 1 semana e 1 mês antes) com horizontes, juro real ex-post (e ex-ante de 1 ano) e R$ 1.000 no CDI contra o IPCA |
| Câmbio | PTAX com média móvel de 21 dias e dólar futuro tracejado, dólar real, volatilidade móvel e resumo dos últimos 12 meses |
| Bolsa e RF | Ibovespa contra o CDI, drawdown e volatilidade; juro real do IMA-B com faixa mín.–máx. e média, duration e carrego projetado |
| Investimento | IDP mensal e em 12 meses (US$ e R$), FBCF por trimestre e variação nominal e real contra o ano anterior |
| Relatórios | Gerar o relatório do mês e o histórico (Planilhas, Excel, rascunho no Gmail) |
| Agenda | Reuniões dos próximos 14 dias no horário de Brasília, com link do Meet |
| Admin | Usuários, Parâmetros (meta, limiares, reuniões do Copom) e Coleta (execuções e status por fonte) |

## Gráfico de retorno acumulado (`componentes/retornos/`)

- **Séries:** chips escolhem os indicadores (CDI, Selic over, IPCA, IGP-M, dólar, Ibovespa, IMA-B), cada um com cor fixa.
- **Rebase:** todas começam em 0% na borda esquerda da janela visível e são recalculadas quando a janela muda.
- **Mudar a janela:**
  - arrastar a faixa de datas do eixo X desloca a janela;
  - o navegador abaixo do gráfico tem alças de início e fim;
  - a roda do mouse dá zoom;
  - os campos de data (início e fim) são a alternativa por teclado.
- **Selecionar um período:** clicar e arrastar dentro do gráfico pinta a faixa. Ao soltar, um cartão mostra o retorno de cada série selecionada só entre as duas datas, no modo ativo e em ordem.
  - O cartão traz os dias úteis do período e os botões "Ampliar para este período" e "Limpar" (Esc também limpa).
  - O cálculo é exato, feito pelo domínio sobre os índices, e não lido do desenho.
- **Tooltip:** retorno desde o início da janela até o ponto sob o mouse.
- **Projeções:** o seletor liga a continuação tracejada (só no modo nominal).
- **URL:** as mudanças vão para a URL sem recarregar a página (`history.replaceState`).
