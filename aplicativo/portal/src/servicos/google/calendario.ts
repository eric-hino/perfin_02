import "server-only";

import { chamarGoogleJson } from "./api";

export interface Reuniao {
  id: string;
  titulo: string;
  inicio: string;        // ISO (data-hora) ou AAAA-MM-DD quando é o dia inteiro
  fim: string;
  diaInteiro: boolean;
  local: string | null;
  linkMeet: string | null;
  linkEvento: string | null;
}

interface EventoGoogle {
  id: string;
  summary?: string;
  status?: string;
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
}

function linkSeguro(url: string | undefined, dominio: RegExp): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && dominio.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

function paraReuniao(e: EventoGoogle): Reuniao {
  const video = e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri;
  return {
    id: e.id,
    titulo: e.summary?.trim() || "(sem título)",
    inicio: e.start?.dateTime ?? e.start?.date ?? "",
    fim: e.end?.dateTime ?? e.end?.date ?? "",
    diaInteiro: !e.start?.dateTime,
    local: e.location?.trim() || null,
    linkMeet: linkSeguro(e.hangoutLink ?? video, /(^|\.)meet\.google\.com$/),
    linkEvento: linkSeguro(e.htmlLink, /(^|\.)google\.com$/),
  };
}

/** Próximas reuniões da agenda principal do usuário logado. */
export async function proximasReunioes(accessToken: string, dias = 14, maximo = 20): Promise<Reuniao[]> {
  const agora = new Date();
  const ate = new Date(agora.getTime() + dias * 86_400_000);
  const parametros = new URLSearchParams({
    timeMin: agora.toISOString(),
    timeMax: ate.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maximo),
    timeZone: "America/Sao_Paulo",
  });
  const dados = await chamarGoogleJson<{ items?: EventoGoogle[] }>(
    accessToken,
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${parametros}`,
  );
  return (dados.items ?? []).filter((e) => e.status !== "cancelled").map(paraReuniao);
}
