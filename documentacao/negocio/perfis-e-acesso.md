# Perfis e acesso

| Perfil | Como entra | O que pode |
|---|---|---|
| Administrador | Principal: e-mail e senha (usuário criado no Supabase Auth com o `ADMIN_EMAIL`) ou Google. Demais administradores: só Google | Tudo o que o usuário faz, mais a área **Admin**: usuários, parâmetros e coleta |
| Usuário | Google, com o e-mail cadastrado pelo admin em Admin → Usuários | Painéis, retornos, assistente, relatórios, rascunho no Gmail e a própria agenda |
| Não autorizado | Google com e-mail fora da lista | Vê "Acesso não autorizado" e o botão para sair |

## Como funciona

- A lista de acesso fica na tabela `usuarios_autorizados` (e-mail, papel, ativo).
- O **admin principal** (`ADMIN_EMAIL`) é cadastrado pelo comando `python aplicativo/supabase/banco.py admin`.
  - Ele tem `principal = true`.
  - Um gatilho no banco impede removê-lo, desativá-lo ou rebaixá-lo.
- Um **Auth Hook** (`hook_antes_criar_usuario`) roda antes de o Supabase criar uma conta:
  - recusa e-mails fora da lista;
  - aceita cadastro por e-mail e senha apenas para o **administrador principal** (os demais administradores entram com o Google).
- O callback do login (`/auth/callback`) confere o papel de novo. Quem não está autorizado é deslogado e vai para `/acesso-nao-autorizado`.
- **Admin que entrou por senha:** para usar Agenda, Drive e Gmail precisa clicar em **Conectar conta Google**, com o mesmo e-mail. Esse botão aparece nas telas que precisam do Google.
- Não existe tela de cadastro. Desativar um usuário corta o acesso na hora: o RLS e o `exigirPerfil` consultam a lista a cada requisição.
