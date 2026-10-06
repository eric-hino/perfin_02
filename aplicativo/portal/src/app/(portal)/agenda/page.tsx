import type { Metadata } from "next";

import ListaReunioes from "@/componentes/agenda/ListaReunioes";
import AvisoReconectar from "@/componentes/relatorios/AvisoReconectar";
import EstadoVazio from "@/componentes/ui/EstadoVazio";
import TituloPagina from "@/componentes/ui/TituloPagina";
import { exigirPerfil } from "@/servicos/auth/sessao";
import { type Reuniao, proximasReunioes } from "@/servicos/google/calendario";
import { ErroGoogleReconectar } from "@/servicos/google/erros";
import { obterAccessToken } from "@/servicos/google/tokens";

export const metadata: Metadata = { title: "Agenda" };

type Resultado = { tipo: "ok"; reunioes: Reuniao[] } | { tipo: "reconectar" } | { tipo: "erro" };

async function carregar(userId: string): Promise<Resultado> {
  try {
    return { tipo: "ok", reunioes: await proximasReunioes(await obterAccessToken(userId)) };
  } catch (erro) {
    return erro instanceof ErroGoogleReconectar ? { tipo: "reconectar" } : { tipo: "erro" };
  }
}

export default async function Agenda() {
  const sessao = await exigirPerfil("usuario");
  const resultado = await carregar(sessao.userId);

  return (
    <>
      <TituloPagina titulo="Agenda" subtitulo="Suas próximas reuniões no Google Agenda (14 dias, horário de Brasília)" />
      {resultado.tipo === "reconectar" && <AvisoReconectar />}
      {resultado.tipo === "erro" && (
        <EstadoVazio titulo="Não foi possível ler a agenda" texto="O Google não respondeu agora. Tente novamente em instantes." />
      )}
      {resultado.tipo === "ok" && resultado.reunioes.length === 0 && (
        <EstadoVazio titulo="Nenhuma reunião nos próximos 14 dias" />
      )}
      {resultado.tipo === "ok" && resultado.reunioes.length > 0 && <ListaReunioes reunioes={resultado.reunioes} />}
    </>
  );
}
