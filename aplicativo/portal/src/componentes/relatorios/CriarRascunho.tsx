"use client";

import { useState } from "react";

import ui from "../ui/ui.module.css";
import estilos from "./relatorios.module.css";
import AvisoReconectar from "./AvisoReconectar";

/** Cria um rascunho no Gmail com o relatório anexado. Nunca envia. */
export default function CriarRascunho({ relatorioId, jaCriado }: { relatorioId: string; jaCriado: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [para, setPara] = useState("");
  const [estado, setEstado] = useState<{ enviando: boolean; erro: string | null; reconectar: boolean; link: string | null }>(
    { enviando: false, erro: null, reconectar: false, link: null },
  );

  const criar = async () => {
    setEstado({ enviando: true, erro: null, reconectar: false, link: null });
    const destinatarios = para.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);
    try {
      const resposta = await fetch(`/api/relatorios/${relatorioId}/rascunho`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ para: destinatarios }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as { erro?: string; reconectar?: boolean; link?: string };
      setEstado(resposta.ok
        ? { enviando: false, erro: null, reconectar: false, link: dados.link ?? null }
        : { enviando: false, erro: dados.erro ?? "Não foi possível criar o rascunho.", reconectar: Boolean(dados.reconectar), link: null });
    } catch {
      setEstado({ enviando: false, erro: "Sem conexão com o Portal.", reconectar: false, link: null });
    }
  };

  if (!aberto) {
    return (
      <button type="button" className={estilos.link} onClick={() => setAberto(true)}>
        {jaCriado ? "Criar outro rascunho" : "Criar rascunho no Gmail"}
      </button>
    );
  }
  return (
    <div className={estilos.rascunho}>
      <label>Destinatários (opcional, separados por vírgula)
        <input type="text" value={para} onChange={(e) => setPara(e.target.value)} maxLength={2000} placeholder="nome@empresa.com.br" />
      </label>
      <button type="button" className={ui.botaoSecundario} onClick={criar} disabled={estado.enviando}>
        {estado.enviando ? "Criando…" : "Criar rascunho (não envia)"}
      </button>
      {estado.erro && <p role="alert" className="negativo">{estado.erro}</p>}
      {estado.reconectar && <AvisoReconectar />}
      {estado.link && (
        <p role="status">Rascunho criado. <a href={estado.link} target="_blank" rel="noopener noreferrer">Abrir os rascunhos do Gmail</a>.</p>
      )}
    </div>
  );
}
