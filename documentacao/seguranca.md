# Segurança

## Credenciais

- Nenhuma credencial está no código.
  - O Portal lê e valida as variáveis com zod (`servicos/config/env.ts`).
  - O coletor lê `COLETOR_DATABASE_URL`.
  - As ferramentas do banco leem `DATABASE_URL`.
- Só `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_PORTAL_URL` vão ao navegador. As duas são URLs públicas.
- Os módulos com segredo importam `server-only`.
- A senha do papel do coletor é gerada pelo `banco.py` e nunca é exibida.
- A senha do administrador fica só como hash no Supabase Auth. A `ADMIN_PASSWORD` não é usada pelo sistema.

## Sessão

- Os cookies de sessão do Supabase são `httpOnly`, `secure` e `SameSite=Lax`. O Portal não usa cliente Supabase no navegador, então nenhum JavaScript da página lê os tokens.
- No callback do login, depois de guardar o refresh token do Google cifrado no banco, a sessão é renovada e o cookie é regravado sem os tokens do Google.

## Autenticação e autorização (em camadas)

1. **Supabase Auth:** login Google (OAuth) ou e-mail e senha, com **cadastro aberto**.
   - O cadastro por senha exige a confirmação do e-mail. Sem ela, ninguém consegue criar uma conta com o e-mail de outra pessoa e usá-la.
   - O Auth Hook recusa e-mails bloqueados.
   - O gatilho `registrar_usuario_cadastrado` dá sempre o papel `usuario`. Os metadados enviados pelo cliente nunca definem o papel.
2. **`proxy.ts`:** valida o JWT (`getClaims`), renova a sessão e manda ao login quem não está logado.
3. **`exigirPerfil()`** no layout do Portal e no layout Admin, e **`verificarPerfilApi()`** em toda rota de API e server action:
   - valida o usuário no servidor de autenticação (`getUser`) e o papel na lista;
   - responde 401 sem sessão e 403 sem permissão;
   - nunca libera por padrão.
4. **RLS** em todas as tabelas: mesmo com a chave publicável, quem não está na lista não lê nada. O `service_role` não é usado.

## Cadastro, confirmação e senha

- **Senha:** 12 ou mais caracteres, com letras e números, e no máximo 72 bytes (limite do bcrypt). É validada no navegador, na server action e de novo pelo Supabase (comprimento mínimo configurado no painel).
- **Respostas neutras:** o cadastro com um e-mail que já tem conta e o pedido de nova senha respondem a mesma coisa, sem revelar se o e-mail existe.
- **`/auth/confirmar`:**
  - valida `type` (`email`, `signup` ou `recovery`) e o formato do `token_hash` antes de chamar `verifyOtp`;
  - redireciona só para destinos fixos, sem parâmetro `next`, o que evita open redirect;
  - link inválido ou expirado leva a `/login?erro=link`.
- **Login por senha de conta bloqueada:** a sessão é encerrada na hora.

## Validação de entradas

- **Filtros da URL:** zod no servidor; valor inválido volta ao padrão.
- **Corpos das APIs:**
  - zod para pergunta (até 2.000 caracteres), histórico (até 10 mensagens), mês (AAAA-MM, fechado) e destinatários (até 20, regex de e-mail, sem quebra de linha);
  - os ids de relatório precisam ser UUID.
- **Assistente:** o corpo da requisição é lido e medido (até 64 KB) antes de ser interpretado.
- **Correção monetária:** o valor digitado só é aceito em formatos não ambíguos ("1.500,50", "1500,50", "1500.50"); é validada no servidor e de novo dentro da função SQL (índice, meses e valor de 0 a 1 trilhão, período até 50 anos).

## Google

- **Escopos em duas etapas:**
  - o login pede só `openid email profile`;
  - `calendar.events.readonly`, `drive.file` (só arquivos criados pelo app) e `gmail.compose` são pedidos no **Conectar conta Google**.
- **Conectar conta Google:**
  - a action exige sessão e grava o cookie httpOnly `perfin_conectar` (10 minutos, `path=/auth`) com o id do usuário;
  - o callback só guarda o refresh token se `conectar=1`, o cookie e a sessão nova forem do **mesmo** usuário. Outra conta Google encerra a sessão;
  - os escopos gravados vêm do `tokeninfo` do Google, ou seja, são os concedidos de fato;
  - o login simples nunca grava nem sobrescreve o token.
- O refresh token é cifrado com AES-256-GCM (`GOOGLE_TOKEN_ENCRYPTION_KEY`) antes de ir ao banco, e cada usuário só lê o próprio (RLS).
- **Nunca enviar e-mail:** o Google não tem escopo só de rascunho. O módulo `gmail.ts` expõe apenas `criarRascunho`, e o teste `mime.test.ts` falha se surgir chamada de envio.
- **Links da agenda:** só são exibidos se forem https dos domínios do Google.

## Assistente (Gemini)

- O servidor recalcula os dados a partir dos filtros. O cliente nunca envia dados.
- A instrução de sistema proíbe recomendação de investimento e manda ignorar instruções embutidas nos dados.
- Limite de 10 perguntas por minuto por usuário.
- A chave do Gemini só é usada no servidor.

## Logs e erros

- Nenhum log registra tokens, senhas ou cabeçalhos `Authorization`.
- As mensagens ao usuário não mostram detalhes internos. O `error.tsx` e o `global-error.tsx` não exibem a mensagem do erro.
- Falha do banco ao verificar o acesso é tratada como erro, com a tela "Não foi possível abrir o Portal", e não como "acesso não autorizado".

## Cabeçalhos HTTP

`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` e `Permissions-Policy`, sem `X-Powered-By`.

## Pendência importante

O arquivo local `dados_perfin.txt` (fora do git) guarda credenciais em texto puro, e elas foram lidas durante o desenvolvimento. Apague o arquivo e **troque** estas credenciais:
- senha do banco;
- client secret do Google;
- chave do Gemini;
- senha do administrador.
