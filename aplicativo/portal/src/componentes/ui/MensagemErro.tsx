"use client";

import estilos from "./ui.module.css";

interface Props {
  titulo: string;
  texto: string;
  acao?: { rotulo: string; aoClicar: () => void };
}

export default function MensagemErro({ titulo, texto, acao }: Props) {
  return (
    <section role="alert" className={estilos.aviso}>
      <h2>{titulo}</h2>
      <p>{texto}</p>
      {acao && (
        <button type="button" className={estilos.botaoSecundario} onClick={acao.aoClicar}>
          {acao.rotulo}
        </button>
      )}
    </section>
  );
}
