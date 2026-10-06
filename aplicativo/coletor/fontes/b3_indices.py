# -*- coding: utf-8 -*-
"""Fechamento diário de índices da B3 (Ibovespa), pelas estatísticas públicas do índice."""

from __future__ import annotations

import base64
import json
from datetime import date

from .comum import FormatoInesperado, Valor, baixar_json, numero_br

URL = "https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay/{parametro}"


def url_do_ano(indice: str, ano: int) -> str:
    parametro = json.dumps({"index": indice, "language": "pt-br", "year": str(ano)}, separators=(",", ":"))
    return URL.format(parametro=base64.b64encode(parametro.encode()).decode())


def interpretar(indicador: str, ano: int, resposta, hoje: date) -> list[Valor]:
    """A resposta é uma matriz: uma linha por dia do mês e uma coluna (rateValueN) por mês."""
    if not isinstance(resposta, dict) or not isinstance(resposta.get("results"), list):
        raise FormatoInesperado("B3 índices: campo 'results' ausente")
    valores = []
    for linha in resposta["results"]:
        dia = linha.get("day")
        if not isinstance(dia, int) or not 1 <= dia <= 31:
            raise FormatoInesperado(f"B3 índices: dia inválido {dia!r}")
        for mes in range(1, 13):
            numero = numero_br(linha.get(f"rateValue{mes}"))
            if numero is None:
                continue
            try:
                data = date(ano, mes, dia)
            except ValueError as erro:
                raise FormatoInesperado(f"B3 índices: data inválida {ano}-{mes}-{dia}") from erro
            if data <= hoje:
                valores.append(Valor(indicador, data, numero))
    return valores


def coletar(indicador: str, indice: str, inicio: date, hoje: date) -> list[Valor]:
    valores: list[Valor] = []
    for ano in range(inicio.year, hoje.year + 1):
        valores.extend(interpretar(indicador, ano, baixar_json(url_do_ano(indice, ano)), hoje))
    return [v for v in valores if v.data >= inicio]
