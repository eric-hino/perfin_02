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
PRINCIPAL_TESTE = "principal.teste.rls@exemplo.com"
NOVO = "novo.cadastro.teste.rls@exemplo.com"


@pytest.fixture()
def con():
    conexao = banco.conectar()
    conexao.autocommit = False
    cur = conexao.cursor()
    # Os testes também rodam contra a produção: nunca esperar muito por um lock.
    cur.execute("set local lock_timeout = '5s'")
    cur.execute(
        "insert into public.usuarios_autorizados (email, papel) values (%s, 'admin'), (%s, 'usuario')",
        (ADMIN_TESTE, USUARIO_TESTE),
    )
    # Num banco novo (CI) não há admin principal: cria um, só dentro da transação.
    cur.execute(
        "insert into public.usuarios_autorizados (email, papel, principal) "
        "select %s, 'admin', true where not exists (select 1 from public.usuarios_autorizados where principal)",
        (PRINCIPAL_TESTE,),
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


def test_hook_aceita_email_novo(con):
    assert hook(con, ESTRANHO, "google") == {}
    assert hook(con, ESTRANHO, "email") == {}


def test_hook_libera_usuario_autorizado_pelo_google(con):
    assert hook(con, USUARIO_TESTE.upper(), "google") == {}


def test_hook_aceita_senha_de_qualquer_email_ativo(con):
    assert hook(con, USUARIO_TESTE, "email") == {}
    assert hook(con, ADMIN_TESTE, "email") == {}
    con.execute("select email from public.usuarios_autorizados where principal")
    assert hook(con, con.fetchone()[0], "email") == {}


def test_hook_recusa_email_bloqueado(con):
    con.execute("update public.usuarios_autorizados set ativo = false where email = %s", (USUARIO_TESTE,))
    resposta = hook(con, USUARIO_TESTE, "google")
    assert resposta["error"]["http_code"] == 403
    assert resposta["error"]["message"] == "Acesso bloqueado."


def test_hook_recusa_evento_sem_email(con):
    assert hook(con, "", "email")["error"]["http_code"] == 403


def criar_conta(cur, email: str, metadados: dict | None = None, confirmada: bool = True):
    """Cria uma conta em auth.users (desfeita no rollback). Pula se o papel não puder."""
    cur.execute("reset role")
    cur.execute("savepoint conta")
    try:
        cur.execute(
            "insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data,"
            " email_confirmed_at, created_at, updated_at) values (gen_random_uuid(),"
            " '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', %s, %s::jsonb, '{}'::jsonb,"
            " case when %s then now() end, now(), now()) returning id",
            (email, json.dumps(metadados or {}), confirmada),
        )
    except Exception as erro:  # sem privilégio de escrita em auth.users
        cur.execute("rollback to savepoint conta")
        pytest.skip(f"não foi possível criar conta de teste: {type(erro).__name__}")
    return cur.fetchone()[0]


def linha(cur, email: str):
    cur.execute("reset role")
    cur.execute("select papel, ativo, origem, nome from public.usuarios_autorizados where email = %s", (email,))
    return cur.fetchone()


def test_gatilho_cria_linha_de_cadastro(con):
    criar_conta(con, NOVO, {"nome": "Fulano de Tal"})
    assert linha(con, NOVO) == ("usuario", True, "cadastro", "Fulano de Tal")


def test_gatilho_ignora_papel_dos_metadados(con):
    criar_conta(con, NOVO, {"papel": "admin", "role": "admin", "nome": "X"})
    assert linha(con, NOVO)[0] == "usuario"


def test_gatilho_espera_confirmacao(con):
    conta = criar_conta(con, NOVO, confirmada=False)
    assert linha(con, NOVO) is None
    con.execute("update auth.users set email_confirmed_at = now() where id = %s", (conta,))
    assert linha(con, NOVO)[:3] == ("usuario", True, "cadastro")


def test_gatilho_preserva_pre_cadastro(con):
    criar_conta(con, ADMIN_TESTE, {"nome": "Admin Teste"})
    assert linha(con, ADMIN_TESTE) == ("admin", True, "admin", "Admin Teste")


def test_gatilho_nao_reativa_bloqueado(con):
    con.execute("update public.usuarios_autorizados set ativo = false where email = %s", (USUARIO_TESTE,))
    criar_conta(con, USUARIO_TESTE)
    assert linha(con, USUARIO_TESTE)[:2] == ("usuario", False)


def test_gatilho_nao_cria_linha_na_troca_de_email(con):
    conta = criar_conta(con, NOVO)
    outro = "outro." + NOVO
    con.execute("update auth.users set email = %s, email_confirmed_at = now() where id = %s", (outro, conta))
    assert linha(con, outro) is None


def test_bloqueado_nao_ve_dados(con):
    con.execute("update public.usuarios_autorizados set ativo = false where email = %s", (USUARIO_TESTE,))
    como(con, "authenticated", USUARIO_TESTE)
    assert contar(con, "indicadores") == 0


def test_usuario_nao_se_autopromove(con):
    como(con, "authenticated", USUARIO_TESTE)
    con.execute(f"update public.usuarios_autorizados set papel = 'admin' where email = '{USUARIO_TESTE}'")
    assert con.rowcount == 0
    assert falha(con, f"update public.usuarios_autorizados set origem = 'admin' where email = '{USUARIO_TESTE}'")
    assert falha(con, f"insert into public.usuarios_autorizados (email, papel) values ('{NOVO}', 'admin')")


def test_admin_inclui_com_nome_mas_nao_com_origem(con):
    como(con, "authenticated", ADMIN_TESTE)
    con.execute(f"insert into public.usuarios_autorizados (email, papel, nome) values ('{NOVO}', 'usuario', 'Novo')")
    assert falha(con, "insert into public.usuarios_autorizados (email, origem) values ('x.teste.rls@exemplo.com', 'cadastro')")
    assert linha(con, NOVO) == ("usuario", True, "admin", "Novo")
