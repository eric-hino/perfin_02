// Regras puras da lista de acesso (Admin → Usuários).

export type OrigemUsuario = "admin" | "cadastro";

export interface ResumoUsuarios {
  total: number;
  porCadastro: number;
  bloqueados: number;
}

export const NOME_MAXIMO = 100;

// Caracteres de controle (C0, DEL e C1), os mesmos que o gatilho do banco remove.
const CONTROLE = /[\u0000-\u001F\u007F-\u009F]/;

/** Totais exibidos no contador da lista: todos, criados pelo cadastro e bloqueados. */
export function resumoUsuarios(lista: ReadonlyArray<{ origem: OrigemUsuario; ativo: boolean }>): ResumoUsuarios {
  return {
    total: lista.length,
    porCadastro: lista.filter((u) => u.origem === "cadastro").length,
    bloqueados: lista.filter((u) => !u.ativo).length,
  };
}

/** Nome opcional: aparado; vazio vira ausente (undefined). */
export function normalizarNome(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const nome = valor.trim();
  return nome === "" ? undefined : nome;
}

/** Valida o nome já normalizado: até 100 caracteres e sem caracteres de controle. */
export function nomeValido(nome: string): boolean {
  return nome.length >= 1 && nome.length <= NOME_MAXIMO && !CONTROLE.test(nome);
}

/** Linhas criadas pelo cadastro não podem ser removidas: removê-las tiraria o acesso sem deixar marcação. Use o bloqueio. */
export function podeRemover(origem: OrigemUsuario): boolean {
  return origem !== "cadastro";
}

/** Texto do contador, ex.: "3 usuários · 1 por cadastro · 0 bloqueados". */
export function textoResumo({ total, porCadastro, bloqueados }: ResumoUsuarios): string {
  const usuarios = total === 1 ? "1 usuário" : `${total} usuários`;
  const bloq = bloqueados === 1 ? "1 bloqueado" : `${bloqueados} bloqueados`;
  return `${usuarios} · ${porCadastro} por cadastro · ${bloq}`;
}
