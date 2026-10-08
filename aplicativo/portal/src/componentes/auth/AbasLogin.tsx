import Link from "next/link";

import type { AbaLogin } from "@/dominio/auth/cadastro";

import estilos from "./auth.module.css";

const ABAS: { aba: AbaLogin; rotulo: string }[] = [
  { aba: "entrar", rotulo: "Entrar" },
  { aba: "cadastro", rotulo: "Cadastrar" },
];

/** Abas da tela de login como links (?aba=), sem JavaScript. */
export default function AbasLogin({ ativa }: { ativa: AbaLogin }) {
  return (
    <nav aria-label="Entrar ou cadastrar" className={estilos.abas}>
      {ABAS.map(({ aba, rotulo }) => (
        <Link
          key={aba}
          href={`/login?aba=${aba}`}
          aria-current={aba === ativa ? "page" : undefined}
          className={aba === ativa ? `${estilos.aba} ${estilos.abaAtiva}` : estilos.aba}
        >
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}
