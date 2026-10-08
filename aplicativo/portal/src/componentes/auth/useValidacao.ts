import { type FormEvent, useState } from "react";
import type { z } from "zod";

import { lerCampos, primeiroErro } from "@/dominio/auth/cadastro";

/**
 * Validação no cliente antes de chamar a server action (só para dar retorno rápido;
 * a action valida de novo). Cancela o envio quando a entrada é inválida.
 */
export function useValidacao(esquema: z.ZodType, campos: readonly string[]) {
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    const resultado = esquema.safeParse(lerCampos(new FormData(evento.currentTarget), campos));
    if (resultado.success) {
      setErroLocal(null);
      return;
    }
    evento.preventDefault();
    setErroLocal(primeiroErro(resultado.error));
  }

  return { erroLocal, aoEnviar };
}
