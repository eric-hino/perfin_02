/** A autorização do Google expirou ou foi revogada: o usuário precisa entrar com o Google de novo. */
export class ErroGoogleReconectar extends Error {
  constructor() {
    super("Reconecte sua conta Google para usar esta função.");
    this.name = "ErroGoogleReconectar";
  }
}

/** Erro de uma API do Google (sem detalhes internos na mensagem). */
export class ErroGoogle extends Error {
  constructor(public readonly status: number, mensagem: string) {
    super(mensagem);
    this.name = "ErroGoogle";
  }
}
