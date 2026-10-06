import "server-only";

// Limite simples de chamadas por usuário (em memória, por instância da função).
// É uma proteção de custo, não de segurança: cada instância conta separadamente.
const JANELA_MS = 60_000;
const MAXIMO_POR_JANELA = 10;
const chamadas = new Map<string, number[]>();

export function dentroDoLimite(userId: string, agora = Date.now()): boolean {
  const recentes = (chamadas.get(userId) ?? []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= MAXIMO_POR_JANELA) {
    chamadas.set(userId, recentes);
    return false;
  }
  recentes.push(agora);
  chamadas.set(userId, recentes);
  return true;
}
