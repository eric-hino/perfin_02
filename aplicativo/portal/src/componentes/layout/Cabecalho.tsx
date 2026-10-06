import LinkNav from "./LinkNav";
import estilos from "./cabecalho.module.css";

const ITENS = [
  { href: "/visao-geral", rotulo: "Visão geral" },
  { href: "/retornos", rotulo: "Retornos" },
  { href: "/inflacao", rotulo: "Inflação" },
  { href: "/juros", rotulo: "Juros" },
  { href: "/cambio", rotulo: "Câmbio" },
  { href: "/bolsa-renda-fixa", rotulo: "Bolsa e RF" },
  { href: "/investimento", rotulo: "Investimento" },
  { href: "/relatorios", rotulo: "Relatórios" },
  { href: "/agenda", rotulo: "Agenda" },
];

interface Props {
  email: string;
  admin: boolean;
}

export default function Cabecalho({ email, admin }: Props) {
  return (
    <header className={estilos.cabecalho}>
      <a href="#conteudo" className={estilos.pular}>Pular para o conteúdo</a>
      <div className={estilos.topo}>
        <span className={estilos.marca}>Portal Perfin</span>
        <div className={estilos.usuario}>
          <span title={email}>{email}</span>
          <form action="/auth/sair" method="post">
            <button type="submit" className={estilos.sair}>Sair</button>
          </form>
        </div>
      </div>
      <nav aria-label="Seções do Portal" className={estilos.nav}>
        {ITENS.map((item) => <LinkNav key={item.href} href={item.href}>{item.rotulo}</LinkNav>)}
        {admin && <LinkNav href="/admin/usuarios" prefixo="/admin">Admin</LinkNav>}
      </nav>
    </header>
  );
}
