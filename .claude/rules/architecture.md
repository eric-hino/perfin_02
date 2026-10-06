# Arquitetura

- Preserve a arquitetura existente. Antes de propor uma mudança estrutural, entenda o padrão atual e justifique por que ele não atende.
- Prefira modificar ou aprimorar um módulo existente a criar um novo.
- Reutilize funções, componentes e utilitários já existentes sempre que possível. Procure antes de escrever algo novo.
- Não introduza novas dependências sem explicar um motivo válido: o que ela resolve, por que o código ou as dependências atuais não bastam e qual o custo (tamanho, manutenção, segurança).
- Regras e lógica de negócio nunca ficam no código React/Next.js (componentes, hooks de UI, páginas). Elas pertencem à camada de serviços/domínio ou ao backend (Supabase), e a interface apenas as consome.
- Evite arquivos com mais de 400 linhas. Se passar disso, divida em módulos coesos.
- Evite funções com mais de 50 linhas. Extraia partes com responsabilidade própria em funções nomeadas.
