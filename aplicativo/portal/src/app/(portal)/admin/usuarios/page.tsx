import type { Metadata } from "next";

import AcoesUsuario from "@/componentes/admin/AcoesUsuario";
import FormularioUsuario from "@/componentes/admin/FormularioUsuario";
import EstadoVazio from "@/componentes/ui/EstadoVazio";
import Painel from "@/componentes/ui/Painel";
import ui from "@/componentes/ui/ui.module.css";
import { type UsuarioAutorizado, listarUsuarios } from "@/servicos/admin/admin";

export const metadata: Metadata = { title: "Usuários" };

export default async function Usuarios() {
  let usuarios: UsuarioAutorizado[] | null = null;
  try {
    usuarios = await listarUsuarios();
  } catch {
    usuarios = null;
  }

  return (
    <>
      <Painel titulo="Incluir usuário" subtitulo="O e-mail precisa ser a conta Google que a pessoa usa para entrar">
        <FormularioUsuario />
      </Painel>
      <Painel titulo="Lista de acesso">
        {usuarios === null ? (
          <EstadoVazio titulo="Não foi possível listar os usuários" texto="Tente recarregar a página." />
        ) : (
          <div className={ui.rolagem}>
            <table className={ui.tabela}>
              <thead><tr><th scope="col">E-mail</th><th scope="col">Papel</th><th scope="col">Situação</th><th scope="col">Ações</th></tr></thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.email}>
                    <th scope="row">{u.email}</th>
                    <td>{u.papel === "admin" ? "Administrador" : "Usuário"}{u.principal ? " (principal)" : ""}</td>
                    <td>{u.ativo ? "Ativo" : "Desativado"}</td>
                    <td>{u.principal ? <span className="neutro">Protegido</span> : <AcoesUsuario email={u.email} papel={u.papel} ativo={u.ativo} />}</td>
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
