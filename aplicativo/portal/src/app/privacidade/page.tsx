import type { Metadata } from "next";

import estilos from "./privacidade.module.css";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <main className={estilos.pagina}>
      <article className={estilos.texto}>
        <h1>Política de privacidade do Portal Perfin</h1>
        <p>
          O Portal Perfin é uma ferramenta interna do time Perfin. O acesso é restrito a e-mails autorizados
          pelo administrador.
        </p>
        <h2>Dados do Google que usamos</h2>
        <ul>
          <li><strong>Identidade (nome e e-mail):</strong> para o login e para conferir se o acesso é autorizado.</li>
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
          Guardamos apenas o token de atualização do Google, cifrado (AES-256-GCM), e o registro dos relatórios
          gerados (link da planilha e do rascunho). Os dados de indicadores vêm de fontes públicas (BCB, IBGE,
          B3 e ANBIMA).
        </p>
        <h2>Revogação</h2>
        <p>
          Você pode revogar o acesso a qualquer momento em myaccount.google.com/permissions. Para remover seus
          dados do Portal, fale com o administrador.
        </p>
      </article>
    </main>
  );
}
