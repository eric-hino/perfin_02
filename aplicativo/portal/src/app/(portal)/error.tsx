"use client";

import MensagemErro from "@/componentes/ui/MensagemErro";

export default function ErroPortal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // A mensagem do erro não é exibida: pode conter detalhes internos.
  return (
    <MensagemErro
      titulo="Não foi possível carregar esta página"
      texto="Tente novamente em instantes. Se o problema continuar, avise o administrador."
      acao={{ rotulo: "Tentar de novo", aoClicar: reset }}
    />
  );
}
