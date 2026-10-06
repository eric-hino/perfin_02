import type { Metadata } from "next";

import FormularioParametros from "@/componentes/admin/FormularioParametros";
import Painel from "@/componentes/ui/Painel";
import { parametros } from "@/servicos/indicadores/repositorio";

export const metadata: Metadata = { title: "Parâmetros" };

export default async function Parametros() {
  const p = await parametros();
  return (
    <Painel titulo="Parâmetros de negócio" subtitulo="Usados nos insights automáticos, nos selos da meta e na Selic implícita por reunião">
      <FormularioParametros meta={p.meta} limiares={p.limiares} reunioesCopom={p.reunioesCopom} />
    </Painel>
  );
}
