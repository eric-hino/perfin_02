# Segurança

## Proibido

- Escrever credenciais (senhas, chaves, tokens, strings de conexão) diretamente no código. Elas vêm sempre de variáveis de ambiente.
- Fazer commit de tokens, chaves ou arquivos `.env`. Só o `.env.example`, sem valores reais, é versionado.
- Expor variáveis de ambiente privadas ao navegador, seja com o prefixo `NEXT_PUBLIC_`, seja passando-as para Client Components ou respostas de API.
- Desabilitar ou contornar a autenticação, mesmo temporariamente, para corrigir um bug.
- Desabilitar o RLS do Supabase ou usar a chave `service_role` como atalho para fazer algo funcionar.
- Registrar em logs senhas digitadas, tokens de autenticação, chaves ou cabeçalhos `Authorization`.

## Ao lidar com tokens, chaves, autenticação ou autorização

- **Validar a autenticação:** confirme no servidor que existe um usuário com sessão válida. Não confie em dados enviados pelo cliente.
- **Validar a autorização:** confirme que esse usuário tem permissão para aquele recurso ou ação específica, não só que está logado.
- **Validar as entradas:** verifique tipo, formato e limites de todo dado recebido antes de usá-lo, também no servidor.
- **Tratar as falhas explicitamente:** em qualquer erro de autenticação, autorização ou validação, negue o acesso e retorne um erro claro. Nunca libere o acesso por padrão nem engula a exceção. A mensagem ao usuário não deve revelar detalhes internos.

Se uma tarefa parecer exigir alguma ação proibida, pare e explique o motivo ao usuário em vez de seguir.
