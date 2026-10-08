import AcoesUsuario from "@/componentes/admin/AcoesUsuario";
import ui from "@/componentes/ui/ui.module.css";
import type { UsuarioAutorizado } from "@/servicos/admin/admin";

interface Props {
  usuarios: UsuarioAutorizado[];
}

/** Tabela da lista de acesso; em telas estreitas rola na horizontal dentro do próprio bloco. */
export default function TabelaUsuarios({ usuarios }: Props) {
  return (
    <div className={ui.rolagem} role="region" aria-label="Lista de usuários" tabIndex={0}>
      <table className={`${ui.tabela} ${ui.tabelaLarga}`}>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">E-mail</th>
            <th scope="col">Origem</th>
            <th scope="col">Papel</th>
            <th scope="col">Situação</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.email}>
              <td>{u.nome ?? <span className="neutro">—</span>}</td>
              <th scope="row">{u.email}</th>
              <td>{u.origem === "cadastro" ? "Cadastro" : "Admin"}</td>
              <td>{u.papel === "admin" ? "Administrador" : "Usuário"}{u.principal ? " (principal)" : ""}</td>
              <td className={u.ativo ? undefined : "negativo"}>{u.ativo ? "Ativo" : "Bloqueado"}</td>
              <td>
                {u.principal
                  ? <span className="neutro">Protegido</span>
                  : <AcoesUsuario email={u.email} papel={u.papel} ativo={u.ativo} origem={u.origem} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
