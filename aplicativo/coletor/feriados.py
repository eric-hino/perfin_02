# -*- coding: utf-8 -*-
"""
Feriados nacionais (padrão ANBIMA) e dias úteis.

Fixos + móveis (baseados na Páscoa) + Consciência Negra (nacional desde 2024).
"""

from __future__ import annotations

from datetime import date, timedelta

FIXOS = {
    (1, 1): "Confraternização Universal",
    (4, 21): "Tiradentes",
    (5, 1): "Dia do Trabalho",
    (9, 7): "Independência do Brasil",
    (10, 12): "Nossa Senhora Aparecida",
    (11, 2): "Finados",
    (11, 15): "Proclamação da República",
    (12, 25): "Natal",
}
ANO_CONSCIENCIA_NEGRA = 2024


def pascoa(ano: int) -> date:
    """Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)."""
    a, b, c = ano % 19, ano // 100, ano % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes = (h + l - 7 * m + 114) // 31
    dia = (h + l - 7 * m + 114) % 31 + 1
    return date(ano, mes, dia)


def feriados_do_ano(ano: int) -> dict[date, str]:
    domingo = pascoa(ano)
    feriados = {date(ano, m, d): nome for (m, d), nome in FIXOS.items()}
    feriados[domingo - timedelta(days=48)] = "Carnaval"
    feriados[domingo - timedelta(days=47)] = "Carnaval"
    feriados[domingo - timedelta(days=2)] = "Sexta-feira da Paixão"
    feriados[domingo + timedelta(days=60)] = "Corpus Christi"
    if ano >= ANO_CONSCIENCIA_NEGRA:
        feriados[date(ano, 11, 20)] = "Dia Nacional de Zumbi e da Consciência Negra"
    return feriados


def feriados_entre(ano_inicial: int, ano_final: int) -> dict[date, str]:
    todos: dict[date, str] = {}
    for ano in range(ano_inicial, ano_final + 1):
        todos.update(feriados_do_ano(ano))
    return todos


def dias_uteis(inicio: date, fim: date) -> list[date]:
    """Dias úteis entre as datas, inclusive."""
    feriados = feriados_entre(inicio.year, fim.year)
    dias, dia = [], inicio
    while dia <= fim:
        if dia.weekday() < 5 and dia not in feriados:
            dias.append(dia)
        dia += timedelta(days=1)
    return dias
