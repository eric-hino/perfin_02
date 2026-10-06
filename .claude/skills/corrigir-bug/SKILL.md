---
name: corrigir-bug
description: Fluxo para corrigir um bug no perfin_02 - reproduzir com um teste, encontrar a causa raiz, corrigir e revisar. Use quando o usuário reportar um erro ou comportamento incorreto.
---

# Corrigir bug

## 1. Entender

Reúna o comportamento esperado, o observado e os passos para reproduzir. Se faltar informação para reproduzir, pergunte ao usuário.

## 2. Reproduzir

Chame o agente `tester` para criar um teste que reproduza o bug. O teste deve falhar antes da correção. Se não for possível automatizar, registre os passos manuais de reprodução.

## 3. Causa raiz

Encontre a causa raiz, não só o sintoma. Se a causa envolver mais de um módulo ou área, ou se a correção puder afetar outras partes, chame o agente `architect` para avaliar o impacto antes de corrigir.

## 4. Correção

Corrija a causa raiz com a menor mudança possível. Rode o teste da etapa 2 (agora deve passar) e os demais testes da área afetada.

## 5. Revisão

Chame o agente `reviewer` com os arquivos alterados e corrija os achados críticos e altos.

## 6. Resumo

Entregue ao usuário: causa raiz, correção aplicada, arquivos alterados, testes adicionados e resultado. Se o bug alterava um comportamento documentado, atualize `documentacao/`.
