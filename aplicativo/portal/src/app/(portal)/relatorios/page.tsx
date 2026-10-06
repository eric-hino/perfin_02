import type { Metadata } from "next";

import CriarRascunho from "@/componentes/relatorios/CriarRascunho";
import GerarRelatorio from "@/componentes/relatorios/GerarRelatorio";
import estilos from "@/componentes/relatorios/relatorios.module.css";
import EstadoVazio from "@/componentes/ui/EstadoVazio";
import Painel from "@/componentes/ui/Painel";
import TituloPagina from "@/componentes/ui/TituloPagina";
import ui from "@/componentes/ui/ui.module.css";
import { formatarMesLongo, hojeEmSaoPaulo } from "@/dominio/datas";
import { ultimoMesFechado } from "@/dominio/retornos/janelas";
import { type Relatorio, listarRelatorios } from "@/servicos/relatorios/servico";

export const metadata: Metadata = { title: "Relatórios" };

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

export default async function Relatorios() {
  const mesMaximo = ultimoMesFechado(hojeEmSaoPaulo()).slice(0, 7);
  let relatorios: Relatorio[] | null = null;
  try {
    relatorios = await listarRelatorios();
  } catch {
    relatorios = null;
  }

  return (
    <>
      <TituloPagina titulo="Relatório do mês"
        subtitulo="Planilha Google na pasta “Portal Perfin” do seu Drive, download em Excel e rascunho no Gmail" />
      <Painel titulo="Gerar relatório" subtitulo="Abas: Resumo, Retornos, Projeções, Inflação, Juros, Câmbio, Bolsa e RF, Investimento e Metodologia">
        <GerarRelatorio mesPadrao={mesMaximo} mesMaximo={mesMaximo} />
      </Painel>
      <Painel titulo="Relatórios gerados">
        {relatorios === null && <EstadoVazio titulo="Não foi possível listar os relatórios" texto="Tente recarregar a página." />}
        {relatorios?.length === 0 && <EstadoVazio titulo="Nenhum relatório ainda" texto="Gere o primeiro relatório acima." />}
        {relatorios && relatorios.length > 0 && (
          <div className={ui.rolagem}>
            <table className={ui.tabela}>
              <thead><tr><th scope="col">Mês</th><th scope="col">Gerado em</th><th scope="col">Ações</th></tr></thead>
              <tbody>
                {relatorios.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{formatarMesLongo(r.mesReferencia)}</th>
                    <td>{dataHora(r.criadoEm)}{r.rascunhoCriadoEm ? ` · rascunho em ${dataHora(r.rascunhoCriadoEm)}` : ""}</td>
                    <td>
                      <div className={estilos.acoes}>
                        <a href={r.planilhaUrl} target="_blank" rel="noopener noreferrer">Abrir no Google Planilhas</a>
                        <a href={`/api/relatorios/${r.id}/xlsx`} download>Baixar Excel (.xlsx)</a>
                        <CriarRascunho relatorioId={r.id} jaCriado={Boolean(r.rascunhoId)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Painel>
    </>
  );
}
