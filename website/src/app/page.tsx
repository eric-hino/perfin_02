import Cabecalho from "@/componentes/Cabecalho";
import Calculadora from "@/componentes/Calculadora";
import Destaques from "@/componentes/Destaques";
import estilos from "@/componentes/site.module.css";
import { linksDoPortal, urlDoPortal } from "@/lib/config";

// Indicadores públicos atualizados a cada hora.
export const revalidate = 3600;

const RECURSOS = [
  { titulo: "Retornos comparáveis", texto: "CDI, inflação, dólar, Ibovespa e IMA-B na mesma base, em qualquer janela." },
  { titulo: "O que o mercado precifica", texto: "Selic, inflação e dólar implícitos nas curvas de juros da B3, todo dia útil." },
  { titulo: "Insights automáticos", texto: "Regras com limiares claros: meta de inflação, juro real, câmbio e mais." },
  { titulo: "Relatório do mês", texto: "Planilha Google, Excel e rascunho de e-mail em um clique." },
];

export default function Inicio() {
  const links = linksDoPortal(urlDoPortal());
  return (
    <>
      <Cabecalho links={links} />
      <main>
        <section className={estilos.hero}>
          {/* Com o cabeçalho visível, a marca já aparece nele. */}
          {!links && <p className={estilos.marca}>Perfin</p>}
          <h1>Portal Perfin</h1>
          <p>A central de análise de indicadores econômicos do time Perfin.</p>
          {links && <a className={estilos.botao} href={links.entrar}>Entrar no Portal</a>}
        </section>

        <section className={estilos.faixaArdosia}>
          <h2>O que o Portal oferece</h2>
          <ul className={estilos.recursos}>
            {RECURSOS.map((r) => <li key={r.titulo}><h3>{r.titulo}</h3><p>{r.texto}</p></li>)}
          </ul>
        </section>

        <section className={estilos.faixaClara} aria-labelledby="titulo-destaques">
          <h2 id="titulo-destaques">Indicadores em destaque</h2>
          <Destaques />
          <p className={estilos.fonte}>Fonte: Banco Central do Brasil (SGS). Atualizado a cada hora.</p>
        </section>

        <section className={estilos.faixaClara} aria-labelledby="titulo-calculadora">
          <h2 id="titulo-calculadora">Calculadora de correção</h2>
          <p className={estilos.secundario}>Corrige um valor por IPCA ou IGP-M do mês inicial ao mês final (inclusive), como a Calculadora do Cidadão.</p>
          <Calculadora />
        </section>

        <footer className={estilos.rodape}>Perfin · dados públicos do BCB e do IBGE · não é recomendação de investimento.</footer>
      </main>
    </>
  );
}
