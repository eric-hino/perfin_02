"use client";

import { useState } from "react";

export interface Mensagem {
  id: number;
  papel: "usuario" | "assistente";
  texto: string;
  erro?: boolean;
}

const MAXIMO_HISTORICO = 10;
const MAXIMO_POR_MENSAGEM = 4000; // o servidor aceita até 8.000 caracteres por item

/** Estado da conversa com o assistente e envio para a API. */
export function useConversa() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (pergunta: string, filtros: string) => {
    const texto = pergunta.trim();
    if (!texto || enviando) return;
    const historico = mensagens.filter((m) => !m.erro).slice(-MAXIMO_HISTORICO)
      .map(({ papel, texto: t }) => ({ papel, texto: t.slice(0, MAXIMO_POR_MENSAGEM) }));
    setMensagens((atuais) => [...atuais, { id: Date.now(), papel: "usuario", texto }]);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: texto, historico, filtros }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as { resposta?: string; erro?: string };
      const ok = resposta.ok && dados.resposta;
      setMensagens((atuais) => [...atuais, {
        id: Date.now() + 1, papel: "assistente", erro: !ok,
        texto: ok ? (dados.resposta as string) : dados.erro ?? "Não foi possível responder agora.",
      }]);
    } catch {
      setMensagens((atuais) => [...atuais, { id: Date.now() + 1, papel: "assistente", erro: true, texto: "Sem conexão com o Portal." }]);
    } finally {
      setEnviando(false);
    }
  };

  return { mensagens, enviando, enviar, limpar: () => setMensagens([]) };
}
