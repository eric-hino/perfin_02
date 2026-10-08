// Pedido de "Conectar conta Google": guardado num cookie httpOnly de curta duração
// entre o clique no botão e o retorno do OAuth (/auth/callback?conectar=1).

export const COOKIE_CONECTAR = "perfin_conectar";

/** Destinos aceitos depois de conectar (lista fixa: nada de URL livre). */
export const DESTINOS_CONECTAR = ["agenda", "relatorios"] as const;
export type DestinoConectar = (typeof DESTINOS_CONECTAR)[number];

export interface PedidoConectar {
  userId: string;
  destino: DestinoConectar;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Destino válido a partir de um valor qualquer (padrão: agenda). */
export function destinoConectar(valor: unknown): DestinoConectar {
  return DESTINOS_CONECTAR.find((d) => d === valor) ?? "agenda";
}

export function valorCookieConectar(pedido: PedidoConectar): string {
  return `${pedido.userId}|${pedido.destino}`;
}

/** Lê o cookie do pedido; formato inválido vira null. */
export function lerCookieConectar(valor: string | undefined): PedidoConectar | null {
  if (!valor) return null;
  const [userId, destino, ...resto] = valor.split("|");
  if (resto.length > 0 || !userId || !UUID.test(userId)) return null;
  const valido = DESTINOS_CONECTAR.find((d) => d === destino);
  return valido ? { userId, destino: valido } : null;
}
