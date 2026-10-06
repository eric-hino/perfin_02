# -*- coding: utf-8 -*-
"""
banco.py — ferramentas de administração do banco do Portal Perfin.

Usa a DATABASE_URL (conexão do usuário postgres). Ela vem da variável de
ambiente ou, se não existir, do .env na raiz do repositório. Nada de
credencial é impresso na tela.

Uso:
    python aplicativo/supabase/banco.py migrar   # aplica migrations/*.sql pendentes
    python aplicativo/supabase/banco.py admin    # cadastra o ADMIN_EMAIL como admin principal
    python aplicativo/supabase/banco.py senha-coletor --github
        # gera nova senha do papel coletor_indicadores e grava o secret no GitHub
    python aplicativo/supabase/banco.py senha-coletor --coletar --inicio 2000-01-01
        # gera nova senha e já roda o coletor com ela (carga inicial local)

As migrações aplicadas ficam em supabase_migrations.schema_migrations, a
mesma tabela do Supabase CLI.
"""

from __future__ import annotations

import argparse
import os
import re
import secrets
import socket
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

from psycopg import sql

PASTA = Path(__file__).resolve().parent
RAIZ = PASTA.parents[1]


def ler_variavel(nome: str) -> str:
    """Lê a variável do ambiente ou do .env da raiz, sem expor o valor."""
    valor = os.environ.get(nome)
    if valor:
        return valor.strip()
    caminho = RAIZ / ".env"
    if caminho.exists():
        for linha in caminho.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if linha.startswith(f"{nome}=") and not linha.startswith("#"):
                return linha.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit(f"Defina {nome} no ambiente ou no .env.")


POOLER_PADRAO = "aws-0-sa-east-1.pooler.supabase.com"


def parametros_conexao() -> dict:
    """
    A conexão direta db.<ref>.supabase.co só tem IPv6. Em redes sem IPv6,
    usa o Session Pooler (IPv4) com o usuário postgres.<ref>.
    """
    url = urlsplit(ler_variavel("DATABASE_URL"))
    params = {
        "host": url.hostname, "port": url.port or 5432, "user": unquote(url.username or ""),
        "password": unquote(url.password or ""), "dbname": (url.path or "/postgres").lstrip("/"),
        "sslmode": "require", "connect_timeout": 20,
    }
    eh_direta = bool(re.fullmatch(r"db\.[a-z0-9]+\.supabase\.co", url.hostname or ""))
    if eh_direta and not tem_ipv4(url.hostname):
        ref = url.hostname.split(".")[1]
        params["host"] = os.environ.get("SUPABASE_POOLER_HOST", POOLER_PADRAO)
        params["port"] = 5432
        params["user"] = f"{params['user']}.{ref}"
    return params


def tem_ipv4(host: str) -> bool:
    try:
        return bool(socket.getaddrinfo(host, 5432, socket.AF_INET))
    except socket.gaierror:
        return False


def conectar():
    try:
        import psycopg
    except ImportError:
        raise SystemExit('Falta o driver: python -m pip install "psycopg[binary]"')
    try:
        return psycopg.connect(**parametros_conexao())
    except psycopg.OperationalError as erro:
        # Nunca imprime a mensagem crua: ela poderia conter dados da conexão.
        raise SystemExit(f"Não consegui conectar ao banco: {type(erro).__name__}")


def migrar() -> int:
    arquivos = sorted((PASTA / "migrations").glob("*.sql"))
    with conectar() as con:
        con.execute("create schema if not exists supabase_migrations")
        con.execute(
            "create table if not exists supabase_migrations.schema_migrations "
            "(version text primary key, statements text[], name text)"
        )
        aplicadas = {v for (v,) in con.execute("select version from supabase_migrations.schema_migrations")}
        pendentes = [a for a in arquivos if a.name.split("_", 1)[0] not in aplicadas]
        if not pendentes:
            print("Nenhuma migração pendente.")
            return 0
        for arq in pendentes:
            versao, nome = arq.stem.split("_", 1)
            sql = arq.read_text(encoding="utf-8")
            print(f"  aplicando {arq.name} ...", end=" ", flush=True)
            with con.transaction():
                con.execute(sql)
                con.execute(
                    "insert into supabase_migrations.schema_migrations (version, statements, name) "
                    "values (%s, %s, %s)",
                    (versao, [sql], nome),
                )
            print("ok")
    print(f"Pronto: {len(pendentes)} migração(ões) aplicada(s).")
    return 0


def definir_admin() -> int:
    email = ler_variavel("ADMIN_EMAIL").lower()
    with conectar() as con, con.transaction():
        con.execute(
            "insert into public.usuarios_autorizados (email, papel, ativo, principal, criado_por) "
            "values (%s, 'admin', true, true, 'banco.py') "
            "on conflict (email) do update set papel = 'admin', ativo = true, principal = true",
            (email,),
        )
    print("Admin principal cadastrado em usuarios_autorizados.")
    return 0


def ref_do_projeto() -> str:
    """Ref do projeto: do host direto (db.<ref>.supabase.co) ou do usuário do pooler (postgres.<ref>)."""
    url = urlsplit(ler_variavel("DATABASE_URL"))
    direto = re.fullmatch(r"db\.([a-z0-9]+)\.supabase\.co", url.hostname or "")
    if direto:
        return direto.group(1)
    usuario = re.fullmatch(r"[a-z_]+\.([a-z0-9]+)", unquote(url.username or ""))
    if usuario:
        return usuario.group(1)
    raise SystemExit("Não consegui identificar o projeto Supabase na DATABASE_URL.")


def url_coletor(senha: str) -> str:
    """URL do Session Pooler (IPv4) para o papel coletor_indicadores."""
    ref = ref_do_projeto()
    host = os.environ.get("SUPABASE_POOLER_HOST", POOLER_PADRAO)
    return f"postgresql://coletor_indicadores.{ref}:{quote(senha, safe='')}@{host}:5432/postgres?sslmode=require"


def senha_coletor(github: bool, coletar: list[str] | None) -> int:
    """
    Gera uma senha nova para coletor_indicadores (rotação), sem exibi-la.
    --github grava COLETOR_DATABASE_URL como secret do repositório (gh CLI).
    --coletar roda o coletor com a URL nova, só neste processo.
    """
    if github and subprocess.run(["gh", "auth", "status"], capture_output=True, cwd=RAIZ).returncode != 0:
        raise SystemExit("O GitHub CLI (gh) não está autenticado; a senha não foi alterada.")
    senha = secrets.token_urlsafe(32)
    url = url_coletor(senha)  # valida o projeto antes de trocar a senha
    with conectar() as con:
        con.execute(sql.SQL("alter role coletor_indicadores with login password {}").format(sql.Literal(senha)))
    print("Senha do papel coletor_indicadores definida (não exibida).")
    if github:
        subprocess.run(["gh", "secret", "set", "COLETOR_DATABASE_URL"], input=url.encode(),
                       check=True, cwd=RAIZ)
        print("Secret COLETOR_DATABASE_URL gravado no GitHub.")
    if coletar is not None:
        ambiente = {**os.environ, "COLETOR_DATABASE_URL": url}
        script = RAIZ / "aplicativo" / "coletor" / "coletar_indicadores.py"
        return subprocess.run([sys.executable, str(script), *coletar], env=ambiente,
                              cwd=script.parent).returncode
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Administração do banco do Portal Perfin")
    sub = ap.add_subparsers(dest="comando", required=True)
    sub.add_parser("migrar", help="aplica as migrações pendentes")
    sub.add_parser("admin", help="cadastra o ADMIN_EMAIL como admin principal")
    p = sub.add_parser("senha-coletor", help="gera (rotaciona) a senha do papel do coletor")
    p.add_argument("--github", action="store_true", help="grava COLETOR_DATABASE_URL no GitHub Secrets")
    p.add_argument("--coletar", nargs=argparse.REMAINDER,
                   help="em seguida roda o coletor; o resto da linha vai para ele")
    args = ap.parse_args()
    if args.comando == "migrar":
        return migrar()
    if args.comando == "admin":
        return definir_admin()
    return senha_coletor(args.github, args.coletar)


if __name__ == "__main__":
    sys.exit(main())
