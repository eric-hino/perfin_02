#!/usr/bin/env python3
"""PreToolUse: bloqueia a edição de arquivos com credenciais e de lockfiles."""
import fnmatch
import json
import os
import sys

SENSIVEIS = [".env", ".env.*", "*.pem", "*.key", "*.p12", "*.pfx", "id_rsa*", "id_ed25519*"]
MODELOS_PERMITIDOS = [".env.example", ".env.sample", ".env.template"]
LOCKFILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "poetry.lock", "pipfile.lock"]


def main():
    try:
        dados = json.loads(sys.stdin.buffer.read().decode("utf-8") or "{}")
    except ValueError:
        return 0

    entrada = dados.get("tool_input") or {}
    caminho = entrada.get("file_path") or entrada.get("notebook_path") or ""
    nome = os.path.basename(caminho).lower()

    if not nome or nome in MODELOS_PERMITIDOS:
        return 0
    if any(fnmatch.fnmatch(nome, padrao) for padrao in SENSIVEIS):
        motivo = (
            f"Bloqueado pelo hook proteger_arquivos: '{caminho}' pode conter credenciais. "
            "Peça ao usuário para editar esse arquivo manualmente; para documentar variáveis, use .env.example."
        )
    elif nome in LOCKFILES:
        motivo = (
            f"Bloqueado pelo hook proteger_arquivos: '{caminho}' é gerado pelo gerenciador de pacotes. "
            "Altere o manifesto e rode o comando de instalação."
        )
    else:
        return 0

    sys.stderr.buffer.write(motivo.encode("utf-8"))
    return 2


if __name__ == "__main__":
    sys.exit(main())
