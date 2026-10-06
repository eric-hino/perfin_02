// Assunto e corpo (HTML) do rascunho de e-mail do relatório.

import { type DataISO, formatarMesLongo } from "../datas";
import { escaparHtml } from "../gmail/mime";
import type { Insight } from "../insights/tipos";

const IDS_PROJECAO = new Set(["copom_precificado", "curva_mudou", "ipca_implicito"]);

/** 3 a 5 destaques, garantindo um de projeção quando houver. */
export function escolherDestaques(insights: readonly Insight[], maximo = 5): Insight[] {
  const projecao = insights.find((i) => IDS_PROJECAO.has(i.id));
  const outros = insights.filter((i) => i !== projecao).slice(0, projecao ? maximo - 1 : maximo);
  return projecao ? [...outros.slice(0, maximo - 1), projecao] : outros;
}

export function assuntoDoRelatorio(mes: DataISO): string {
  return `Relatório de indicadores — ${formatarMesLongo(mes)}`;
}

export function corpoDoRelatorio(mes: DataISO, destaques: readonly Insight[], urlPlanilha: string): string {
  const itens = destaques
    .map((i) => `<li><strong>${escaparHtml(i.titulo)}:</strong> ${escaparHtml(i.texto)}</li>`)
    .join("");
  const link = escaparHtml(urlPlanilha);
  return [
    `<div style="font-family:'Nunito Sans','Segoe UI',Helvetica,sans-serif;color:#101B2A;font-size:14px;line-height:1.5">`,
    `<p>Segue o relatório de indicadores de ${escaparHtml(formatarMesLongo(mes))}.</p>`,
    `<p><strong>Destaques</strong></p><ul>${itens || "<li>Sem destaques automáticos para o mês.</li>"}</ul>`,
    `<p>Planilha completa: <a href="${link}" style="color:#101B2A">${link}</a> (o arquivo .xlsx segue anexo).</p>`,
    `<p style="color:#6D6E71;font-size:12px">Fontes: BCB, IBGE, B3 e ANBIMA. Projeções implícitas em preços de mercado `,
    `embutem prêmios de risco e não são previsão nem recomendação.</p>`,
    `</div>`,
  ].join("");
}
