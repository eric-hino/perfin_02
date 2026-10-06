import type { Reuniao } from "@/servicos/google/calendario";

import estilos from "./agenda.module.css";

const FUSO = "America/Sao_Paulo";

function dia(r: Reuniao): string {
  const data = r.diaInteiro ? new Date(`${r.inicio}T12:00:00Z`) : new Date(r.inicio);
  return data.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long", day: "2-digit", month: "2-digit" });
}

function horario(r: Reuniao): string {
  if (r.diaInteiro) return "Dia inteiro";
  const opcoes = { timeZone: FUSO, hour: "2-digit", minute: "2-digit" } as const;
  return `${new Date(r.inicio).toLocaleTimeString("pt-BR", opcoes)} – ${new Date(r.fim).toLocaleTimeString("pt-BR", opcoes)}`;
}

/** Próximas reuniões agrupadas por dia, no horário de Brasília. */
export default function ListaReunioes({ reunioes }: { reunioes: Reuniao[] }) {
  const grupos = new Map<string, Reuniao[]>();
  for (const r of reunioes) grupos.set(dia(r), [...(grupos.get(dia(r)) ?? []), r]);

  return (
    <div className={estilos.agenda}>
      {[...grupos.entries()].map(([nomeDia, itens]) => (
        <section key={nomeDia} className={estilos.dia}>
          <h2>{nomeDia}</h2>
          <ul>
            {itens.map((r) => (
              <li key={r.id} className={estilos.reuniao}>
                <span className={`${estilos.hora} numero`}>{horario(r)}</span>
                <div>
                  <strong>{r.titulo}</strong>
                  {r.local && <p>{r.local}</p>}
                  <p className={estilos.links}>
                    {r.linkMeet && <a href={r.linkMeet} target="_blank" rel="noopener noreferrer">Entrar no Meet</a>}
                    {r.linkEvento && <a href={r.linkEvento} target="_blank" rel="noopener noreferrer">Abrir no Google Agenda</a>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
