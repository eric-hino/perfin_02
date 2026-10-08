"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ErroAdmin, alterarUsuario, esquemaNovoUsuario, esquemaParametros, incluirUsuario, removerUsuario, salvarParametros,
} from "@/servicos/admin/admin";
import { verificarPerfilApi } from "@/servicos/auth/sessao";

export interface EstadoAcao {
  erro: string | null;
  sucesso: string | null;
}

const OK = (sucesso: string): EstadoAcao => ({ erro: null, sucesso });
const ERRO = (erro: string): EstadoAcao => ({ erro, sucesso: null });

/** Toda ação confere de novo, no servidor, se quem chama é administrador. */
async function exigirAdmin(): Promise<string | null> {
  const acesso = await verificarPerfilApi("admin");
  return acesso.ok ? null : "Acesso não autorizado.";
}

async function executar(acao: () => Promise<void>, sucesso: string): Promise<EstadoAcao> {
  const negado = await exigirAdmin();
  if (negado) return ERRO(negado);
  try {
    await acao();
  } catch (erro) {
    return ERRO(erro instanceof ErroAdmin ? erro.message : "Não foi possível concluir a operação.");
  }
  revalidatePath("/admin", "layout");
  return OK(sucesso);
}

export async function incluirUsuarioAcao(_e: EstadoAcao, formulario: FormData): Promise<EstadoAcao> {
  const entrada = esquemaNovoUsuario.safeParse({
    email: formulario.get("email"), papel: formulario.get("papel"), nome: formulario.get("nome"),
  });
  if (!entrada.success) return ERRO("Informe um e-mail válido, o papel e, se quiser, um nome de até 100 caracteres.");
  return executar(() => incluirUsuario(entrada.data), `${entrada.data.email} incluído.`);
}

const esquemaAlteracao = z.object({
  email: z.email(),
  campo: z.enum(["papel", "ativo"]),
  valor: z.string(),
});

export async function alterarUsuarioAcao(_e: EstadoAcao, formulario: FormData): Promise<EstadoAcao> {
  const entrada = esquemaAlteracao.safeParse(Object.fromEntries(formulario));
  if (!entrada.success) return ERRO("Alteração inválida.");
  const { email, campo, valor } = entrada.data;
  if (campo === "papel" && valor !== "admin" && valor !== "usuario") return ERRO("Papel inválido.");
  const mudanca = campo === "papel" ? { papel: valor as "admin" | "usuario" } : { ativo: valor === "true" };
  return executar(() => alterarUsuario(email, mudanca), "Usuário atualizado.");
}

export async function removerUsuarioAcao(_e: EstadoAcao, formulario: FormData): Promise<EstadoAcao> {
  const email = z.email().safeParse(formulario.get("email"));
  if (!email.success) return ERRO("E-mail inválido.");
  return executar(() => removerUsuario(email.data), `${email.data} removido.`);
}

export async function salvarParametrosAcao(_e: EstadoAcao, formulario: FormData): Promise<EstadoAcao> {
  const campo = (nome: string) => String(formulario.get(nome) ?? "").replace(",", ".");
  const entrada = esquemaParametros.safeParse({
    meta_inflacao: { centro: campo("centro"), tolerancia: campo("tolerancia") },
    limiares_insights: Object.fromEntries(
      ["aceleracao_pp", "descolamento_igpm_ipca_pp", "juro_real_restritivo_pct", "juro_real_expansionista_pct",
        "dolar_variacao_mes_pct", "drawdown_ibovespa_pct", "mudanca_curva_pp", "yield_imab_alto_pct", "meses_extremo"]
        .map((n) => [n, campo(n)]),
    ),
    copom_reunioes: {
      datas: String(formulario.get("copom") ?? "").split(/[\s,;]+/).map((d) => d.trim()).filter(Boolean).sort(),
    },
  });
  if (!entrada.success) return ERRO("Confira os valores: números dentro dos limites e datas no formato AAAA-MM-DD.");
  return executar(() => salvarParametros(entrada.data), "Parâmetros salvos.");
}
