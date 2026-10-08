# Documentação do Portal Perfin

O Portal Perfin é a central de análise de indicadores econômicos do time. Ele tem três partes:

| Parte | Pasta | O que é |
|---|---|---|
| Portal | `aplicativo/portal` | Next.js com login: painéis, retornos, projeções, insights, relatório, agenda e assistente |
| Coletor | `aplicativo/coletor` | Python no GitHub Actions: busca BCB, IBGE, B3 e ANBIMA e grava no Supabase |
| Banco | `aplicativo/supabase` | Migrações SQL (tabelas, RLS, funções) e ferramentas de administração |
| Site | `website` | Next.js público: institucional, indicadores em destaque e calculadora de correção |

## Negócio

- [Perfis e acesso](negocio/perfis-e-acesso.md)
- [Indicadores e fontes](negocio/indicadores.md)
- [Retornos, janelas e demais cálculos](negocio/calculos.md)
- [Projeções implícitas nos preços de mercado](negocio/projecoes.md)
- [Insights automáticos](negocio/insights.md)
- [Painéis do Portal](negocio/paineis.md)
- [Relatório do mês, Gmail, Agenda e Assistente](negocio/relatorio-agenda-assistente.md)

## Técnica

- [Arquitetura](arquitetura.md)
- [Configuração (Vercel, Google Cloud, Supabase, GitHub)](configuracao.md)
- [Instruções do login e cadastro unificados (PDF)](instrucoes/login-e-cadastro.pdf)
- [Segurança](seguranca.md)
- [Coletor](coletor.md)
- [Banco de dados](banco.md)
- [Site público](site.md)
- [Testes, comandos e CI](testes.md)
