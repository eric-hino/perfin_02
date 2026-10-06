import "server-only";

import { INSTRUCAO_SISTEMA } from "@/dominio/assistente/contexto";

import { ambiente } from "../config/env";

const MODELO_RESERVA = "gemini-3.5-flash-lite";
const TEMPO_PRINCIPAL_MS = 20_000;
const TEMPO_RESERVA_MS = 12_000;

export interface MensagemChat {
  papel: "usuario" | "assistente";
  texto: string;
}

export class ErroAssistente extends Error {
  constructor(mensagem = "O assistente não conseguiu responder agora. Tente novamente em instantes.") {
    super(mensagem);
    this.name = "ErroAssistente";
  }
}

interface RespostaGemini {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
}

async function chamarModelo(modelo: string, contexto: string, historico: MensagemChat[], pergunta: string, tempoMs: number) {
  const contents = [
    { role: "user", parts: [{ text: `DADOS DO PORTAL (use apenas estes dados):\n${contexto}` }] },
    { role: "model", parts: [{ text: "Entendido. Vou responder só com base nesses dados." }] },
    ...historico.map((m) => ({ role: m.papel === "usuario" ? "user" : "model", parts: [{ text: m.texto }] })),
    { role: "user", parts: [{ text: pergunta }] },
  ];
  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": ambiente().GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCAO_SISTEMA }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(tempoMs),
    },
  );
  if (!resposta.ok) throw new ErroAssistente();
  const dados = (await resposta.json()) as RespostaGemini;
  const texto = dados.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!texto) throw new ErroAssistente("O assistente não retornou resposta para essa pergunta.");
  return texto;
}

/** Pergunta ao Gemini com o contexto do recorte. Tenta o modelo reserva se o principal falhar. */
export async function perguntar(contexto: string, historico: MensagemChat[], pergunta: string): Promise<string> {
  const principal = ambiente().GEMINI_MODEL;
  try {
    return await chamarModelo(principal, contexto, historico, pergunta, TEMPO_PRINCIPAL_MS);
  } catch {
    if (principal === MODELO_RESERVA) throw new ErroAssistente();
    return chamarModelo(MODELO_RESERVA, contexto, historico, pergunta, TEMPO_RESERVA_MS).catch(() => {
      throw new ErroAssistente();
    });
  }
}
