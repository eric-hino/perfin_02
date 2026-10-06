# React / Next.js

Vale para todo código React/Next.js em `aplicativo/` e `website/`. Complementa `architecture.md`.

## Componentes

- Um componente por arquivo, nomeado em PascalCase igual ao arquivo (`CartaoConta.tsx`).
- Componentes pequenos e com uma responsabilidade. Se um componente cuida de dados, layout e interação ao mesmo tempo, divida.
- Antes de criar um componente, procure um equivalente que já exista e reutilize ou estenda.
- Use TypeScript e tipe as props explicitamente. Evite `any`.
- Componentes de UI só exibem dados e disparam ações. Cálculos, validações de negócio e regras ficam fora deles.

## Server e Client Components (App Router)

- Use Server Components por padrão. Adicione `"use client"` só quando precisar de estado, efeitos, eventos do navegador ou APIs do browser.
- Mantenha `"use client"` o mais baixo possível na árvore, em componentes pequenos, não em páginas inteiras.
- Nunca importe código que usa segredos ou chaves privadas em um Client Component.

## Estado e efeitos

- Guarde no estado só o que não dá para calcular. Valores derivados são calculados na renderização.
- Evite `useEffect` para sincronizar estado ou buscar dados que podem vir do servidor. Use-o apenas para integrar com sistemas externos.
- Todo `useEffect` declara todas as dependências e limpa o que criou (listeners, timers, assinaturas).
- Não altere estado diretamente: crie novos objetos e arrays.
- Prefira estado local. Use contexto ou estado global só quando vários pontos distantes da árvore precisarem do mesmo dado.

## Dados e Supabase

- O acesso ao Supabase fica centralizado em funções de serviço, nunca espalhado pelos componentes.
- Toda busca de dados trata os três estados: carregando, erro e vazio.
- A segurança dos dados depende das políticas RLS do Supabase, não de esconder algo na interface.
- Variáveis com prefixo `NEXT_PUBLIC_` vão para o navegador. Só use esse prefixo para valores públicos, como a URL e a chave publishable.

## Listas, formulários e acessibilidade

- Listas usam `key` estável e única (um id), nunca o índice do array quando os itens podem mudar.
- Formulários validam no cliente para dar feedback e sempre validam de novo no servidor.
- Use elementos semânticos (`button`, `nav`, `main`, `label`). Imagens têm `alt`, e todo campo tem rótulo.
- Use `next/image` para imagens e `next/link` para navegação interna.

## Estilo e organização

- Siga a solução de estilo já adotada no projeto. Não misture abordagens.
- Textos de interface em português (Brasil).
- Não deixe `console.log`, código comentado ou imports sem uso.
