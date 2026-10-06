"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import estilos from "../graficos/graficos.module.css";
import ui from "../ui/ui.module.css";
import AvisoReconectar from "./AvisoReconectar";

/** Escolha do mês e geração da Planilha Google do relatório. */
export default function GerarRelatorio({ mesPadrao, mesMaximo }: { mesPadrao: string; mesMaximo: string }) {
  const router = useRouter();
  const [mes, setMes] = useState(mesPadrao);
  const [estado, setEstado] = useState<{ gerando: boolean; erro: string | null; reconectar: boolean; url: string | null }>(
    { gerando: false, erro: null, reconectar: false, url: null },
  );

  const gerar = async () => {
    setEstado({ gerando: true, erro: null, reconectar: false, url: null });
    try {
      const resposta = await fetch("/api/relatorios", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mes }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as { erro?: string; reconectar?: boolean; relatorio?: { planilhaUrl: string } };
      if (!resposta.ok) {
        setEstado({ gerando: false, erro: dados.erro ?? "Não foi possível gerar o relatório.", reconectar: Boolean(dados.reconectar), url: null });
        return;
      }
      setEstado({ gerando: false, erro: null, reconectar: false, url: dados.relatorio?.planilhaUrl ?? null });
      router.refresh();
    } catch {
      setEstado({ gerando: false, erro: "Sem conexão com o Portal.", reconectar: false, url: null });
    }
  };

  return (
    <div className={ui.secao}>
      <div className={estilos.controles}>
        <label>Mês de referência
          <input type="month" value={mes} min="2001-01" max={mesMaximo} onChange={(e) => setMes(e.target.value)} />
        </label>
        <button type="button" className={ui.botaoPrimario} onClick={gerar} disabled={estado.gerando || !mes}>
          {estado.gerando ? "Gerando a planilha…" : "Gerar relatório do mês"}
        </button>
      </div>
      {estado.erro && <p role="alert" className="negativo">{estado.erro}</p>}
      {estado.reconectar && <AvisoReconectar />}
      {estado.url && (
        <p role="status">Planilha criada na pasta &quot;Portal Perfin&quot; do seu Drive: <a href={estado.url} target="_blank" rel="noopener noreferrer">abrir no Google Planilhas</a>.</p>
      )}
    </div>
  );
}
