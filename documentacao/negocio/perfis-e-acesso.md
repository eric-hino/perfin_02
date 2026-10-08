# Perfis e acesso

| Perfil | Como entra | O que pode |
|---|---|---|
| Administrador | E-mail e senha ou Google. É promovido por outro admin em Admin → Usuários (o principal é o `ADMIN_EMAIL`) | Tudo o que o usuário faz, mais a área **Admin**: usuários, parâmetros e coleta |
| Usuário | **Cadastro aberto:** qualquer pessoa se cadastra por e-mail e senha (depois de confirmar o e-mail) ou com o Google | Painéis, retornos, assistente, relatórios, rascunho no Gmail e a própria agenda |
| Bloqueado | Conta com `ativo = false` na lista | Não cria conta nem entra. Vê "Seu acesso foi bloqueado ou removido pelo administrador" |

## Entrar e cadastrar

- **No site:** o menu do canto superior direito tem **Entrar** e **Cadastrar**. Os dois levam à tela do Portal (`/login` e `/login?aba=cadastro`), então a sessão fica num lugar só.
- **No Portal (`/login`):** as abas **Entrar** e **Cadastrar** oferecem as mesmas duas formas.
  - **Google:** "Continuar com Google" ou "Cadastrar com Google". Na primeira vez a conta é criada, já confirmada pelo Google.
  - **E-mail e senha:**
    - o cadastro pede nome, e-mail, senha (12 ou mais caracteres, com letras e números) e confirmação;
    - o Supabase envia um link de confirmação, que abre `/auth/confirmar`;
    - só depois de confirmar a pessoa consegue entrar.
- **Esqueci minha senha (`/esqueci-senha`):**
  - a resposta é sempre neutra, sem revelar se o e-mail tem conta;
  - o link do e-mail abre `/redefinir-senha`.
- **Mesmo e-mail nas duas formas:** a pessoa usa a mesma conta, seja pela senha, seja pelo Google.

## Google em duas etapas

- O **login com Google** pede só nome e e-mail (`openid email profile`).
- **Agenda, Drive e Gmail** são autorizados depois, pelo botão **Conectar conta Google**. O botão aparece na Agenda e nos Relatórios quando ainda não há autorização.
  - O Portal só guarda o acesso se a conta Google escolhida for **a mesma** da sessão. Se for outra, a sessão é encerrada e a tela pede para usar a mesma conta.
  - Os escopos gravados são os que o Google concedeu de fato. Se a pessoa desmarcar um, o recurso correspondente volta a pedir a conexão.

## Como funciona no banco

- **A lista de acesso** é a tabela `usuarios_autorizados`, com as colunas e-mail, nome, papel, ativo, origem e principal.
  - `origem = 'cadastro'`: a linha foi criada pelo gatilho `registrar_usuario_cadastrado`, quando a conta teve o e-mail confirmado (no Google, isso acontece na hora). O papel é sempre `usuario`: o que o cliente manda nos metadados é ignorado.
  - `origem = 'admin'`: a pessoa foi incluída pelo admin, que pode já definir o papel (ex.: admin) antes do primeiro acesso. Esse pré-cadastro prevalece sobre o gatilho, que só completa o nome se faltar.
- **O Auth Hook `hook_antes_criar_usuario`** só recusa e-mail bloqueado ou evento sem e-mail.
- **O admin principal** (`ADMIN_EMAIL`, `principal = true`) é cadastrado por `python aplicativo/supabase/banco.py admin`. Um gatilho impede removê-lo, bloqueá-lo ou rebaixá-lo.
- **O bloqueio corta o acesso na hora:** o RLS e o `exigirPerfil` consultam a lista a cada requisição.
- **Em Admin → Usuários:**
  - contas de cadastro só podem ser **bloqueadas**, não removidas. Remover a linha deixaria a conta sem acesso e sem marcação. A regra vale também no servidor: a remoção só apaga linhas com `origem = 'admin'`;
  - um contador mostra o total, quantas vieram de cadastro e quantas estão bloqueadas.

## Riscos aceitos

- Qualquer pessoa com conta vê os painéis e usa o assistente. O limite do assistente é de 10 perguntas por minuto por usuário.
- O bloqueio é por e-mail: uma pessoa bloqueada pode se cadastrar com outro e-mail.
- Os e-mails saem pelo SMTP padrão do Supabase, que tem limite de poucos envios por hora. Ao estourar, a tela orienta tentar mais tarde ou usar o Google.
- Sem verificação do Google, até 100 usuários podem autorizar Agenda, Drive e Gmail. O login simples não entra nesse limite.
