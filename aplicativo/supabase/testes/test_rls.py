# -*- coding: utf-8 -*-
"""
Testes de RLS contra o banco real (rodam só localmente, com DATABASE_URL).

Cada teste roda numa transação que é desfeita no fim (rollback): nada é gravado.
Simula os papéis com SET ROLE e as claims do JWT com request.jwt.claims.

    python -m pytest aplicativo/supabase/testes -q
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import banco  # noqa: E402

ADMIN_TESTE = "admin.teste.rls@exemplo.com"
USUARIO_TESTE = "usuario.teste.rls@exemplo.com"
ESTRANHO = "estranho.teste.rls@exemplo.com"


@pytest.fixture()
def con():
    conexao = banco.conectar()
    conexao.autocommit = False
    cur = conexao.cursor()
    cur.execute(
        "insert into public.usuarios_autorizados (email, papel) values (%s, 'admin'), (%s, 'usuario')",
        (ADMIN_TESTE, USUARIO_TESTE),
    )
    yield cur
    conexao.rollback()
    conexao.close()


def como(cur, papel: str, email: str | None = None, sub: str = "00000000-0000-0000-0000-000000000001"):
    cur.execute("reset role")
    cur.execute(f"set local role {papel}")
    claims = json.dumps({"email": email, "sub": sub, "role": papel}) if email else "{}"
    cur.execute("select set_config('request.jwt.claims', %s, true)", (claims,))


def contar(cur, tabela: str) -> int:
    cur.execute(f"select count(*) from public.{tabela}")
    return cur.fetchone()[0]


def falha(cur, sql: str) -> bool:
    """Executa num savepoint; True se o banco negou (erro de permissão)."""
    cur.execute("savepoint teste")
    try:
        cur.execute(sql)
        cur.execute("release savepoint teste")
        return False
    except Exception:
        cur.execute("rollback to savepoint teste")
        return True


def test_anon_nao_le_tabelas(con):
    como(con, "anon")
    for tabela in ("indicador_valores", "indicadores", "usuarios_autorizados", "parametros", "google_credenciais"):
        assert falha(con, f"select count(*) from public.{tabela}"), tabela


def test_anon_usa_so_funcoes_publicas(con):
    como(con, "anon")
    con.execute("select count(*) from public.destaques_publicos()")
    assert con.fetchone()[0] >= 0
    assert falha(con, "select public.series_valores(array['cdi'], '2026-01-01', '2026-02-01')")


def test_destaques_publicos_so_bcb_ibge(con):
    como(con, "anon")
    con.execute("select codigo from public.destaques_publicos()")
    codigos = {c for (c,) in con.fetchall()}
    assert not codigos & {"ibovespa", "imab", "imab_yield"}


def test_nao_autorizado_nao_ve_dados(con):
    como(con, "authenticated", ESTRANHO)
    assert contar(con, "indicador_valores") == 0
    assert contar(con, "indicadores") == 0
    assert contar(con, "usuarios_autorizados") == 0


def test_usuario_le_dados_mas_nao_administra(con):
    como(con, "authenticated", USUARIO_TESTE)
    assert contar(con, "indicadores") > 0
    assert contar(con, "usuarios_autorizados") == 0
    con.execute("update public.parametros set valor = '{}'::jsonb where chave = 'meta_inflacao'")
    assert con.rowcount == 0


def test_admin_gerencia_usuarios_mas_nao_o_principal(con):
    como(con, "authenticated", ADMIN_TESTE)
    assert contar(con, "usuarios_autorizados") >= 2
    assert falha(con, "delete from public.usuarios_autorizados where principal")
    assert falha(con, "update public.usuarios_autorizados set papel = 'usuario' where principal")


def test_usuario_nao_ve_credencial_de_outro(con):
    con.execute("reset role")
    con.execute("select id from auth.users limit 1")
    linha = con.fetchone()
    if not linha:
        pytest.skip("sem usuários no Auth para testar")
    como(con, "authenticated", USUARIO_TESTE, sub="00000000-0000-0000-0000-00000000abcd")
    assert contar(con, "google_credenciais") == 0
    assert contar(con, "relatorios") == 0


def test_coletor_so_tem_os_privilegios_minimos(con):
    con.execute("reset role")
    def pode(tabela: str, acao: str) -> bool:
        con.execute("select has_table_privilege('coletor_indicadores', %s, %s)", (f"public.{tabela}", acao))
        return con.fetchone()[0]
    for tabela in ("google_credenciais", "usuarios_autorizados", "relatorios", "parametros"):
        assert not pode(tabela, "select"), tabela
    assert pode("indicador_valores", "insert") and pode("curvas_mercado", "update")
    assert not pode("indicador_valores", "delete")
    assert not pode("indicadores", "update")


def hook(con, email: str, provedor: str) -> dict:
    con.execute("reset role")
    evento = json.dumps({"user": {"email": email, "app_metadata": {"provider": provedor}}})
    con.execute("select public.hook_antes_criar_usuario(%s::jsonb)", (evento,))
    return con.fetchone()[0]


def test_hook_bloqueia_email_fora_da_lista(con):
    assert hook(con, ESTRANHO, "google")["error"]["http_code"] == 403


def test_hook_libera_usuario_autorizado_pelo_google(con):
    assert hook(con, USUARIO_TESTE.upper(), "google") == {}


def test_hook_so_aceita_cadastro_por_senha_do_admin_principal(con):
    assert hook(con, USUARIO_TESTE, "email")["error"]["http_code"] == 403
    assert hook(con, ADMIN_TESTE, "email")["error"]["http_code"] == 403  # admin não principal usa Google
    assert hook(con, ADMIN_TESTE, "google") == {}
    con.execute("select email from public.usuarios_autorizados where principal")
    principal = con.fetchone()
    if principal:
        assert hook(con, principal[0], "email") == {}
