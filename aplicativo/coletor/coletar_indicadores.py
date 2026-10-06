# -*- coding: utf-8 -*-
"""
Coletor de indicadores do Portal Perfin.

Lê o catálogo (public.indicadores), busca cada indicador ativo na sua fonte
(BCB, IBGE, B3, ANBIMA), baixa as curvas de juros da B3 e grava tudo no
Supabase com upsert. Cada execução fica registrada em public.coletas.

Uso:
    python coletar_indicadores.py                         # incremental
    python coletar_indicadores.py --inicio 2000-01-01     # recarga completa das séries
    python coletar_indicadores.py --mercado-desde 2018-01-02 --curvas-desde 2024-01-02
    python coletar_indicadores.py --somente cdi,selic_over --inicio 2000-01-01
        # só os itens listados (códigos de indicador, "imab" ou "curvas")

Precisa da variável de ambiente COLETOR_DATABASE_URL (papel coletor_indicadores).
Sai com código 1 se alguma fonte falhar; as demais seguem normalmente.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import banco
import feriados
from fontes import anbima_ima, b3_indices, b3_taxas_swap, bcb_sgs, ibge_sidra
from fontes.comum import FormatoInesperado, Valor

DATA_INICIAL_SERIES = date(2000, 1, 1)
DATA_INICIAL_MERCADO = date(2018, 1, 2)
DATA_INICIAL_CURVAS = date(2024, 1, 2)  # curvas são volumosas: ~530 linhas por dia
REVISAO_SERIES_DIAS = 90       # rebusca para capturar revisões
REVISAO_TRIMESTRAL_DIAS = 730  # FBCF é revisado por até dois anos
RECUPERACAO_DIAS = 15         # dias recentes sem curva/IMA-B são buscados de novo
FUSO = ZoneInfo("America/Sao_Paulo")
ANOS_FERIADOS_A_FRENTE = 15
CODIGOS_IMA = {"numero": "imab", "yield": "imab_yield", "duration": "imab_duration"}


@dataclass
class Execucao:
    hoje: date
    inicio_forcado: date | None
    mercado_desde: date | None
    curvas_desde: date | None
    somente: set[str] | None = None
    detalhes: dict = field(default_factory=dict)

    def incluir(self, chave: str) -> bool:
        return self.somente is None or chave in self.somente

    def registrar(self, chave: str, linhas: int, ultima: date | None, erro: str | None = None) -> None:
        self.detalhes[chave] = {
            "status": "falha" if erro else "sucesso",
            "linhas": linhas,
            "ultima_referencia": ultima.isoformat() if ultima else None,
            "erro": erro,
        }

    @property
    def falhas(self) -> list[str]:
        return [k for k, v in self.detalhes.items() if v["status"] == "falha"]


def inicio_incremental(ultima: date | None, revisao_dias: int, padrao: date) -> date:
    if ultima is None:
        return padrao
    return ultima - timedelta(days=revisao_dias)


def buscar_serie(item: dict, inicio: date, hoje: date) -> list[Valor]:
    fonte, codigo, serie = item["fonte"], item["codigo"], item["serie"]
    if fonte == "BCB_SGS":
        return bcb_sgs.coletar(codigo, serie, inicio, hoje)
    if fonte == "IBGE_SIDRA":
        return ibge_sidra.coletar(codigo, serie, inicio)
    if fonte == "B3_INDICES":
        return b3_indices.coletar(codigo, serie, inicio, hoje)
    raise FormatoInesperado(f"fonte não suportada para série simples: {fonte}")


def coletar_series(con, exe: Execucao, itens: list[dict]) -> None:
    """BCB, IBGE e índices B3: um indicador por vez, com janela de revisão."""
    for item in itens:
        codigo = item["codigo"]
        revisao = REVISAO_TRIMESTRAL_DIAS if item["frequencia"] == "trimestral" else REVISAO_SERIES_DIAS
        inicio = exe.inicio_forcado or inicio_incremental(
            banco.ultima_data(con, codigo), revisao, DATA_INICIAL_SERIES)
        try:
            valores = buscar_serie(item, inicio, exe.hoje)
            gravadas = banco.gravar_valores(con, valores)
            exe.registrar(codigo, gravadas, max((v.data for v in valores), default=None))
        except (FormatoInesperado, ConnectionError, ValueError) as erro:
            exe.registrar(codigo, 0, None, f"{type(erro).__name__}: {erro}")
        print(f"  {codigo:14s} {exe.detalhes[codigo]['status']:8s} {exe.detalhes[codigo]['linhas']} linhas")


def dias_a_buscar(ja_gravados: set[date], ultima: date | None, desde_forcado: date | None, hoje: date,
                  padrao: date) -> list[date]:
    """Dias úteis a buscar: desde a data forçada, ou os recentes que faltam (inclui falhas anteriores)."""
    if desde_forcado:  # recarga forçada: busca tudo de novo, inclusive o que já existe
        return feriados.dias_uteis(desde_forcado, hoje)
    if ultima:
        inicio = ultima - timedelta(days=RECUPERACAO_DIAS)
    else:
        inicio = padrao
    return [d for d in feriados.dias_uteis(inicio, hoje) if d not in ja_gravados]


def registrar_dias(exe: Execucao, chave: str, gravadas: int, ultima: date | None, resultado) -> None:
    """Registra o resultado de uma coleta dia a dia, com os dias que falharam."""
    partes = []
    if resultado.dias_com_falha:
        partes.append(f"ConnectionError em {len(resultado.dias_com_falha)} dia(s): "
                      + ", ".join(d.isoformat() for d in resultado.dias_com_falha[:10]))
    if resultado.erro_formato:
        partes.append(f"FormatoInesperado: {resultado.erro_formato}")
    exe.registrar(chave, gravadas, ultima, "; ".join(partes) or None)


def coletar_ima(con, exe: Execucao) -> None:
    ultima = banco.ultima_data(con, "imab")
    gravados = banco.datas_com_valor(con, "imab", ultima - timedelta(days=RECUPERACAO_DIAS)) if ultima else set()
    dias = dias_a_buscar(gravados, ultima, exe.mercado_desde, exe.hoje, DATA_INICIAL_MERCADO)
    try:
        resultado = anbima_ima.coletar(dias, "IMA-B", CODIGOS_IMA)
        gravadas = banco.gravar_valores(con, resultado.itens)
        registrar_dias(exe, "imab", gravadas, max((v.data for v in resultado.itens), default=None), resultado)
    except (FormatoInesperado, ConnectionError, ValueError) as erro:
        exe.registrar("imab", 0, None, f"{type(erro).__name__}: {erro}")
    print(f"  {'imab (ANBIMA)':14s} {exe.detalhes['imab']['status']:8s} {len(dias)} dias consultados")


def coletar_curvas(con, exe: Execucao) -> None:
    ultima = banco.ultima_curva(con)
    gravados = banco.datas_com_curva(con, ultima - timedelta(days=RECUPERACAO_DIAS)) if ultima else set()
    dias = dias_a_buscar(gravados, ultima, exe.curvas_desde, exe.hoje, DATA_INICIAL_CURVAS)
    try:
        resultado = b3_taxas_swap.coletar(dias)
        gravadas = banco.gravar_curvas(con, resultado.itens)
        registrar_dias(exe, "curvas_b3", gravadas, max((p.data_base for p in resultado.itens), default=None), resultado)
    except (FormatoInesperado, ConnectionError, ValueError) as erro:
        exe.registrar("curvas_b3", 0, None, f"{type(erro).__name__}: {erro}")
    print(f"  {'curvas (B3)':14s} {exe.detalhes['curvas_b3']['status']:8s} {len(dias)} dias consultados")


def executar(con, exe: Execucao) -> str:
    cal = feriados.feriados_entre(DATA_INICIAL_SERIES.year, exe.hoje.year + ANOS_FERIADOS_A_FRENTE)
    banco.gravar_feriados(con, cal)

    itens = banco.catalogo(con)
    simples = [i for i in itens
               if i["fonte"] in ("BCB_SGS", "IBGE_SIDRA", "B3_INDICES") and exe.incluir(i["codigo"])]
    coletar_series(con, exe, simples)
    if exe.incluir("imab") and any(i["fonte"] == "ANBIMA_IMA" for i in itens):
        coletar_ima(con, exe)
    if exe.incluir("curvas"):
        coletar_curvas(con, exe)

    if not exe.falhas:
        return "sucesso"
    return "falha" if len(exe.falhas) == len(exe.detalhes) else "parcial"


def data_arg(texto: str) -> date:
    return datetime.strptime(texto, "%Y-%m-%d").date()


def main() -> int:
    ap = argparse.ArgumentParser(description="Coleta indicadores e curvas para o Portal Perfin")
    ap.add_argument("--inicio", type=data_arg, help="recarrega as séries desde AAAA-MM-DD")
    ap.add_argument("--mercado-desde", type=data_arg, help="recarrega o IMA-B desde AAAA-MM-DD")
    ap.add_argument("--curvas-desde", type=data_arg, help="recarrega as curvas da B3 desde AAAA-MM-DD")
    ap.add_argument("--somente", help="lista separada por vírgula: códigos de indicador, imab, curvas")
    args = ap.parse_args()

    somente = {s.strip() for s in args.somente.split(",") if s.strip()} if args.somente else None
    # "Hoje" no fuso de Brasília: o cron roda às 00h UTC, que ainda é o dia anterior aqui.
    exe = Execucao(datetime.now(FUSO).date(), args.inicio, args.mercado_desde, args.curvas_desde, somente)
    with banco.conectar() as con:
        coleta_id = banco.iniciar_coleta(con)
        try:
            status = executar(con, exe)
        except Exception as erro:  # registra e repassa: a execução não pode ficar "executando"
            exe.registrar("geral", 0, None, f"{type(erro).__name__}: {erro}")
            banco.finalizar_coleta(con, coleta_id, "falha", exe.detalhes)
            raise
        banco.finalizar_coleta(con, coleta_id, status, exe.detalhes)

    print(f"Coleta {coleta_id}: {status}.")
    if exe.falhas:
        print("Fontes com falha: " + ", ".join(exe.falhas))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
