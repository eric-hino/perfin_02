import type { Metadata } from "next";

import EstadoVazio from "@/componentes/ui/EstadoVazio";
import Painel from "@/componentes/ui/Painel";
import ui from "@/componentes/ui/ui.module.css";
import { formatarData } from "@/dominio/datas";
import { painelDeColeta } from "@/servicos/admin/admin";

export const metadata: Metadata = { title: "Coleta" };

const STATUS = { executando: "Executando", sucesso: "Sucesso", parcial: "Parcial", falha: "Falha" };
const DIAS_ALERTA = 4;

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

export default async function PaginaColeta() {
  const painel = await painelDeColeta().catch(() => null);
  if (painel === null) return <EstadoVazio titulo="Não foi possível listar as coletas" />;
  const { coletas, diasSemColeta } = painel;
  if (!coletas.length) return <EstadoVazio titulo="Nenhuma coleta registrada" texto="Rode o workflow “Coletar indicadores” no GitHub." />;

  const ultima = coletas[0];
  const fontes = Object.entries(ultima.detalhes);

  return (
    <>
      <Painel titulo="Última execução" subtitulo={`${dataHora(ultima.iniciadaEm)} · ${STATUS[ultima.status]}`}>
        {diasSemColeta !== null && diasSemColeta >= DIAS_ALERTA && (
          <p role="alert" className="negativo">
            Sem coleta há {diasSemColeta} dias. Verifique o workflow no GitHub (agendamentos são desativados após 60 dias sem atividade
            em repositórios públicos).
          </p>
        )}
        <div className={ui.rolagem}>
          <table className={ui.tabela}>
            <thead><tr><th scope="col">Fonte</th><th scope="col">Status</th><th scope="col" className={ui.num}>Linhas gravadas</th>
              <th scope="col" className={ui.num}>Última referência</th><th scope="col">Erro</th></tr></thead>
            <tbody>
              {fontes.map(([fonte, d]) => (
                <tr key={fonte}>
                  <th scope="row">{fonte}</th>
                  <td className={d.status === "falha" ? "negativo" : undefined}>{d.status === "falha" ? "Falha" : "Sucesso"}</td>
                  <td className={ui.num}>{d.linhas}</td>
                  <td className={ui.num}>{d.ultima_referencia ? formatarData(d.ultima_referencia) : "—"}</td>
                  <td>{d.erro ? (d.erro.includes("FormatoInesperado") ? `A fonte mudou de formato: ${d.erro}` : d.erro) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>
      <Painel titulo="Histórico de execuções">
        <div className={ui.rolagem}>
          <table className={ui.tabela}>
            <thead><tr><th scope="col">Início</th><th scope="col">Fim</th><th scope="col">Status</th><th scope="col">Fontes com falha</th></tr></thead>
            <tbody>
              {coletas.map((c) => (
                <tr key={c.id}>
                  <td>{dataHora(c.iniciadaEm)}</td>
                  <td>{c.finalizadaEm ? dataHora(c.finalizadaEm) : "—"}</td>
                  <td>{STATUS[c.status]}</td>
                  <td>{Object.entries(c.detalhes).filter(([, d]) => d.status === "falha").map(([f]) => f).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>
    </>
  );
}
