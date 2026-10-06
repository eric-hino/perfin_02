---
name: implementar-funcionalidade
description: Fluxo completo para implementar uma funcionalidade ou mudança não trivial no perfin_02 usando os agentes architect, frontend, tester e reviewer. Use quando o usuário pedir uma funcionalidade nova ou uma alteração que envolva mais de um arquivo.
---

# Implementar funcionalidade

Siga as etapas em ordem. Se precisar pular uma etapa, avise o usuário e explique o motivo.

## 1. Análise

Chame o agente `architect` com o requisito completo. Apresente ao usuário o impacto, os arquivos envolvidos, os riscos e o plano. Se houver dúvidas em aberto, peça ao usuário para resolvê-las. Espere a aprovação do plano antes de seguir.

## 2. Implementação

- Partes de interface (React/Next.js): chame o agente `frontend` passando o plano aprovado.
- Demais partes: implemente seguindo o plano.

Se a implementação precisar se desviar do plano, avise o usuário antes de continuar.

## 3. Testes

Chame o agente `tester` com os arquivos alterados e o plano. Se ele reportar bugs, corrija-os e rode os testes de novo.

## 4. Revisão

Chame o agente `reviewer` com os arquivos alterados. Corrija os achados críticos e altos e chame o `reviewer` de novo até não restar nenhum. Leve os achados médios e baixos ao usuário para decisão.

## 5. Documentação

Atualize `documentacao/` com o que mudou (regra em `.claude/rules/documentacao.md`).

## 6. Resumo

Entregue ao usuário: o que foi feito, arquivos alterados, resultado dos testes, achados da revisão que ficaram em aberto e pendências.
