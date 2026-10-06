"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import estilos from "./assistente.module.css";
import { useConversa } from "./useConversa";

const SUGESTOES = [
  "O Ibovespa ganhou do CDI na janela?",
  "Quanto o mercado espera de CDI em 12 meses?",
  "O IPCA está dentro da meta?",
  "Por que o IGP-M descolou do IPCA?",
];

/** Painel lateral do assistente (Gemini). Envia só a pergunta e os filtros da tela. */
export default function Assistente() {
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const parametros = useSearchParams();
  const { mensagens, enviando, enviar, limpar } = useConversa();
  const idPainel = useId();

  const enviarPergunta = (texto: string) => {
    if (enviando || !texto.trim()) return;
    setPergunta("");
    void enviar(texto, parametros.toString());
  };

  return (
    <>
      <button type="button" className={estilos.abrir} aria-expanded={aberto} aria-controls={idPainel}
        onClick={() => setAberto(!aberto)}>
        {aberto ? "Fechar assistente" : "Assistente"}
      </button>
      {aberto && (
        <aside id={idPainel} className={estilos.painel} aria-label="Assistente de indicadores">
          <header className={estilos.topo}>
            <h2>Assistente</h2>
            <p>Responde sobre os dados da tela, respeitando os filtros. Não faz recomendação de investimento.</p>
          </header>
          <ol className={estilos.mensagens} aria-live="polite">
            {mensagens.length === 0 && SUGESTOES.map((s) => (
              <li key={s}><button type="button" className={estilos.sugestao} onClick={() => enviarPergunta(s)}>{s}</button></li>
            ))}
            {mensagens.map((m) => (
              <li key={m.id} className={m.papel === "usuario" ? estilos.usuario : m.erro ? estilos.erro : estilos.resposta}>
                {m.texto}
              </li>
            ))}
            {enviando && <li className={estilos.resposta} role="status">Analisando os dados…</li>}
          </ol>
          <form className={estilos.formulario} onSubmit={(e) => { e.preventDefault(); enviarPergunta(pergunta); }}>
            <label htmlFor={`${idPainel}-pergunta`} className="visualmente-oculto">Sua pergunta</label>
            <textarea id={`${idPainel}-pergunta`} value={pergunta} maxLength={2000} rows={3}
              placeholder="Pergunte sobre os indicadores filtrados…" onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarPergunta(pergunta); } }} />
            <div className={estilos.acoes}>
              <button type="button" onClick={limpar} disabled={!mensagens.length}>Limpar</button>
              <button type="submit" disabled={enviando || !pergunta.trim()}>Enviar</button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
