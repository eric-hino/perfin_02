"use client";

import "./globals.css";

// Erro fora das páginas (ex.: o layout do Portal não conseguiu verificar o acesso).
// A mensagem do erro não é exibida: pode conter detalhes internos.
export default function ErroGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <main style={{ padding: "80px 24px", maxWidth: "70ch" }}>
          <h1>Não foi possível abrir o Portal</h1>
          <p>Tente novamente em instantes. Se o problema continuar, avise o administrador.</p>
          <button type="button" onClick={reset}>Tentar de novo</button>
        </main>
      </body>
    </html>
  );
}
