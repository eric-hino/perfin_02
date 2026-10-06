# Documentação

- Toda funcionalidade nova ou alterada em `aplicativo/` ou `website/` deve ser refletida em `documentacao/` na mesma tarefa.
- Documente o que o código faz de fato, não o que se planeja fazer.
- Documentos e materiais visuais seguem a identidade da Perfin (skill `formatar-perfin`).
- O hook `.claude/hooks/documentacao.py` avisa ao final da resposta quando houve alteração em `aplicativo/` ou `website/` sem alteração em `documentacao/`. Se a mudança não precisar de documentação (uma refatoração sem mudança de comportamento, por exemplo), explique isso ao usuário.
