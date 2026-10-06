# Coletor de indicadores (`aplicativo/coletor`)

Roda no **GitHub Actions** (`.github/workflows/coletar-indicadores.yml`):
- de segunda a sexta às 21h de Brasília (`0 0 * * 2-6` UTC);
- também por disparo manual (*Run workflow*), aceitando argumentos extras.

Antes de coletar, o workflow roda os testes do coletor.

## O que faz

1. Grava os feriados nacionais de 2000 até 15 anos à frente.
2. Para cada indicador ativo do catálogo, busca na fonte a partir da última data menos 90 dias, para pegar revisões. A FBCF usa 730 dias, porque o IBGE revisa por até 2 anos.
3. IMA-B: consulta a ANBIMA dia a dia, para os dias úteis seguintes à última data gravada.
4. Curvas: baixa o `TaxaSwap` da B3 de cada dia útil seguinte à última curva gravada e afina os vértices (veja [indicadores](negocio/indicadores.md)).
5. Faz upsert que só regrava valores que mudaram e registra a execução em `coletas`, com status por fonte, linhas, última referência e erro.

Se uma fonte falha, as outras seguem e o processo termina com código 1, o que deixa o workflow vermelho.

**Falhas na coleta dia a dia (curvas e IMA-B):**
- uma falha de rede num dia não descarta os demais: os dias bons são gravados e os que falharam ficam registrados em `coletas`;
- a próxima execução busca de novo os dias úteis dos últimos 15 dias que ainda não têm dado;
- uma mudança de formato interrompe a fonte;
- com `--mercado-desde` ou `--curvas-desde`, a recarga busca de novo **todos** os dias desde a data informada, inclusive os já gravados.

"Hoje" é calculado no fuso de Brasília, porque o cron roda às 00h UTC.

## Fontes

| Arquivo | Fonte |
|---|---|
| `fontes/bcb_sgs.py` | API SGS do BCB, em janelas de 5 anos. A API às vezes devolve uma página HTML de erro com status 200, e isso é tratado como falha temporária, com nova tentativa |
| `fontes/ibge_sidra.py` | Tabela 1846, variável 585, FBCF |
| `fontes/b3_indices.py` | `sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay` (matriz anual dia × mês) |
| `fontes/b3_taxas_swap.py` | `www.b3.com.br/pesquisapregao/download?filelist=TSaammdd.ex_` (zip com autoextraível que também é zip) |
| `fontes/anbima_ima.py` | POST em `www.anbima.com.br/informacoes/ima/ima-sh-down.asp` (CSV por data) |

**Validador de formato:** cada fonte confere colunas, cabeçalhos e layout. Se algo mudar:
- ela lança `FormatoInesperado`;
- nada é gravado;
- Admin → Coleta mostra "A fonte mudou de formato".

**Riscos aceitos:**
- As fontes da B3 e da ANBIMA não são APIs oficiais e podem mudar sem aviso.
- Os termos de uso delas restringem a redistribuição, por isso esses dados não vão para o site público.

**Observação:** a página antiga "Taxas Referenciais" da B3 (`www2.bmf.com.br/.../lum-taxas-referenciais-bmf-ptBR.asp`) está fora do ar. Usamos o arquivo TaxaSwap, que traz as mesmas curvas.

## Comandos

```bash
cd aplicativo/coletor
pip install -r requirements-dev.txt
python -m pytest -q
COLETOR_DATABASE_URL=... python coletar_indicadores.py                 # incremental
python coletar_indicadores.py --inicio 2000-01-01                      # recarrega as séries
python coletar_indicadores.py --somente curvas --curvas-desde 2024-01-02
```

**Carga inicial feita em 06/10/2026:**
- séries desde 2000;
- IMA-B desde 02/01/2018;
- curvas desde 02/01/2024.
