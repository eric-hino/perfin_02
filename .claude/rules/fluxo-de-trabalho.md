# Fluxo de trabalho com agentes

- Funcionalidades novas e mudanças não triviais (mais de um arquivo ou mudança de arquitetura) seguem a skill `implementar-funcionalidade`, que começa pelo agente `architect`.
- Bugs seguem a skill `corrigir-bug`.
- Interfaces React/Next.js são implementadas pelo agente `frontend`.
- Mudanças de código não triviais passam pelo agente `tester` e depois pelo agente `reviewer` antes de serem dadas como concluídas.
- Os agentes `architect` e `reviewer` só leem. Não peça a eles que alterem arquivos.
