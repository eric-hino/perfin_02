import type { Metadata } from "next";

import FormularioUsuario from "@/componentes/admin/FormularioUsuario";
import TabelaUsuarios from "@/componentes/admin/TabelaUsuarios";
import EstadoVazio from "@/componentes/ui/EstadoVazio";
import Painel from "@/componentes/ui/Painel";
import ui from "@/componentes/ui/ui.module.css";
import { resumoUsuarios, textoResumo } from "@/dominio/admin/usuarios";
import { type UsuarioAutorizado, listarUsuarios } from "@/servicos/admin/admin";

export const metadata: Metadata = { title: "Usuários" };

async function carregarUsuarios(): Promise<UsuarioAutorizado[] | null> {
  try {
    return await listarUsuarios();
  } catch {
    return null;
  }
}

function ListaDeAcesso({ usuarios }: { usuarios: UsuarioAutorizado[] | null }) {
  if (usuarios === null) {
    return <EstadoVazio titulo="Não foi possível listar os usuários" texto="Tente recarregar a página." />;
  }
  if (usuarios.length === 0) {
    return <EstadoVazio titulo="Nenhum usuário na lista" texto="As contas aparecem aqui depois do cadastro ou da inclusão acima." />;
  }
  return (
    <>
      <p className={ui.subtitulo}>{textoResumo(resumoUsuarios(usuarios))}</p>
      <TabelaUsuarios usuarios={usuarios} />
    </>
  );
}

export default async function Usuarios() {
  const usuarios = await carregarUsuarios();
  return (
    <>
      <Painel titulo="Incluir usuário" subtitulo="Pré-cadastro opcional para definir o papel antes do primeiro acesso">
        <FormularioUsuario />
      </Painel>
      <Painel
        titulo="Lista de acesso"
        subtitulo="Contas criadas pelo cadastro e incluídas pelo administrador. Bloqueie para tirar o acesso."
      >
        <ListaDeAcesso usuarios={usuarios} />
      </Painel>
    </>
  );
}
