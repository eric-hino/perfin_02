import type { Metadata } from "next";
import Link from "next/link";

import FormularioEsqueciSenha from "@/componentes/auth/FormularioEsqueciSenha";

import estilos from "../login/login.module.css";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function EsqueciSenha() {
  return (
    <main className={estilos.pagina}>
      <section className={estilos.caixa} aria-labelledby="titulo">
        <p className={estilos.marca}>Portal Perfin</p>
        <h1 id="titulo">Esqueci minha senha</h1>
        <p className={estilos.subtitulo}>Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.</p>
        <FormularioEsqueciSenha />
        <Link href="/login" className={estilos.voltar}>Voltar para o login</Link>
      </section>
    </main>
  );
}
