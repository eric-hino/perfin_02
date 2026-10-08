import type { Metadata } from "next";

import estilos from "./privacidade.module.css";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <main className={estilos.pagina}>
      <article className={estilos.texto}>
        <h1>Política de privacidade do Portal Perfin</h1>
        <p>
          O Portal Perfin é uma central de análise de indicadores econômicos. Qualquer pessoa pode criar uma conta;
          o administrador pode bloquear o acesso a qualquer momento.
        </p>
        <h2>Dados do cadastro e do login</h2>
        <ul>
          <li><strong>Nome e e-mail:</strong> informados no cadastro (ou vindos da sua conta Google), usados para
            identificar você no Portal e para o administrador gerenciar o acesso.</li>
          <li>
            <strong>Login por e-mail e senha:</strong> a senha é guardada pelo serviço de autenticação (Supabase Auth)
            apenas em forma de hash; o Portal nunca a vê depois do envio. Enviamos e-mails só para confirmar o
            cadastro e para redefinir a senha.
          </li>
          <li>
            <strong>Login com Google:</strong> pede apenas sua identidade (nome, e-mail e foto do perfil). Nenhum
            outro dado do Google é acessado no login.
          </li>
        </ul>
        <h2>Dados do Google que usamos (só se você conectar)</h2>
        <p>
          Agenda, Drive e Gmail só são autorizados quando você clica em &quot;Conectar conta Google&quot; na Agenda ou
          nos Relatórios. Sem isso, o Portal não acessa nenhum deles.
        </p>
        <ul>
          <li><strong>Google Agenda (somente leitura):</strong> para mostrar suas próximas reuniões. Nada é gravado.</li>
          <li>
            <strong>Google Drive (apenas arquivos criados pelo Portal):</strong> para criar a planilha do relatório
            mensal na pasta &quot;Portal Perfin&quot; e exportá-la em Excel.
          </li>
          <li>
            <strong>Gmail (criação de rascunhos):</strong> para criar um rascunho com o relatório anexado.
            O Portal nunca envia e-mails.
          </li>
        </ul>
        <h2>Armazenamento</h2>
        <p>
          Guardamos seu nome e e-mail, o token de atualização do Google (só se você conectar a conta), cifrado
          (AES-256-GCM), e o registro dos relatórios gerados (link da planilha e do rascunho). Os dados de
          indicadores vêm de fontes públicas (BCB, IBGE, B3 e ANBIMA).
        </p>
        <h2>Revogação</h2>
        <p>
          Você pode revogar o acesso do Google a qualquer momento em myaccount.google.com/permissions. Para remover
          sua conta e seus dados do Portal, fale com o administrador.
        </p>
      </article>
    </main>
  );
}
