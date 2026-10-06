#!/usr/bin/env python3
"""Garante que mudanças em aplicativo/ ou website/ venham acompanhadas de documentação.

registrar (PostToolUse): anota a área de cada arquivo editado na sessão.
verificar (Stop): se houve edição de código sem edição em documentacao/, pede uma vez
que o Claude atualize a documentação ou explique por que ela não é necessária.
"""
import json
import os
import sys
import tempfile

AREAS_CODIGO = ("aplicativo", "website")
AREA_DOCS = "documentacao"


def arquivo_estado(session_id):
    pasta = os.path.join(tempfile.gettempdir(), "perfin_02-claude")
    os.makedirs(pasta, exist_ok=True)
    return os.path.join(pasta, f"{session_id}.txt")


def area_do_arquivo(caminho, raiz):
    try:
        relativo = os.path.relpath(os.path.abspath(caminho), os.path.abspath(raiz))
    except ValueError:  # drives diferentes no Windows
        return None
    primeira = relativo.replace("\\", "/").split("/")[0]
    return primeira if primeira in AREAS_CODIGO + (AREA_DOCS,) else None


def registrar(dados):
    entrada = dados.get("tool_input") or {}
    caminho = entrada.get("file_path") or entrada.get("notebook_path")
    raiz = os.environ.get("CLAUDE_PROJECT_DIR") or dados.get("cwd") or os.getcwd()
    area = area_do_arquivo(caminho, raiz) if caminho else None
    if area:
        with open(arquivo_estado(dados.get("session_id", "sem-sessao")), "a", encoding="utf-8") as f:
            f.write(area + "\n")


def verificar(dados):
    estado = arquivo_estado(dados.get("session_id", "sem-sessao"))
    if not os.path.exists(estado):
        return
    with open(estado, encoding="utf-8") as f:
        areas = set(f.read().split())
    os.remove(estado)

    # Já bloqueamos uma vez nesta resposta: não bloquear de novo para evitar laço.
    if dados.get("stop_hook_active"):
        return

    alteradas = [a for a in AREAS_CODIGO if a in areas]
    if alteradas and AREA_DOCS not in areas:
        pastas = " e ".join(f"{a}/" for a in alteradas)
        print(json.dumps({
            "decision": "block",
            "reason": (
                f"Arquivos em {pastas} foram alterados, mas documentacao/ não. "
                "Atualize a documentação correspondente (regra em .claude/rules/documentacao.md) "
                "ou explique ao usuário por que esta mudança não precisa ser documentada."
            ),
        }))


def main():
    try:
        dados = json.loads(sys.stdin.buffer.read().decode("utf-8") or "{}")
    except ValueError:
        return 0
    modo = sys.argv[1] if len(sys.argv) > 1 else ""
    if modo == "registrar":
        registrar(dados)
    elif modo == "verificar":
        verificar(dados)
    return 0


if __name__ == "__main__":
    sys.exit(main())
