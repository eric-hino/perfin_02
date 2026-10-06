# -*- coding: utf-8 -*-
"""Feriados nacionais conferidos contra o calendário da ANBIMA."""

from datetime import date

import feriados


def test_pascoa_conhecida():
    assert feriados.pascoa(2024) == date(2024, 3, 31)
    assert feriados.pascoa(2026) == date(2026, 4, 5)
    assert feriados.pascoa(2000) == date(2000, 4, 23)


def test_feriados_moveis_2026():
    f = feriados.feriados_do_ano(2026)
    assert date(2026, 2, 16) in f and date(2026, 2, 17) in f   # Carnaval
    assert date(2026, 4, 3) in f                                # Sexta-feira da Paixão
    assert date(2026, 6, 4) in f                                # Corpus Christi


def test_consciencia_negra_so_a_partir_de_2024():
    assert date(2023, 11, 20) not in feriados.feriados_do_ano(2023)
    assert date(2024, 11, 20) in feriados.feriados_do_ano(2024)


def test_quantidade_de_feriados_anbima():
    # ANBIMA: 12 feriados nacionais por ano até 2023 (com Carnaval em dois dias), 13 desde 2024.
    assert len(feriados.feriados_do_ano(2023)) == 12
    assert len(feriados.feriados_do_ano(2025)) == 13


def test_dias_uteis_pula_fim_de_semana_e_feriado():
    dias = feriados.dias_uteis(date(2026, 4, 1), date(2026, 4, 7))
    # 03/04 é Sexta-feira da Paixão; 04 e 05 são fim de semana
    assert dias == [date(2026, 4, 1), date(2026, 4, 2), date(2026, 4, 6), date(2026, 4, 7)]


def test_dias_uteis_em_um_ano_comercial():
    # 2025: 261 dias de semana menos 9 feriados em dia de semana = 252 dias úteis.
    assert len(feriados.dias_uteis(date(2025, 1, 1), date(2025, 12, 31))) == 252
