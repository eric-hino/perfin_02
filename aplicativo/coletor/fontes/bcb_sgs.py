# -*- coding: utf-8 -*-
"""Séries do Banco Central (SGS): IPCA, IGP-M, PTAX, CDI, Selic, IDP."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from .comum import FormatoInesperado, SemDados, Valor, baixar_json

URL = (
    "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados"
    "?formato=json&dataInicial={ini}&dataFinal={fim}"
)
ANOS_POR_JANELA = 5  # a API limita séries diárias a 10 anos; janelas menores falham menos


def janelas(inicio: date, fim: date):
    """Divide o período em janelas de até ANOS_POR_JANELA anos."""
    ini = inicio
    while ini <= fim:
        try:
            limite = ini.replace(year=ini.year + ANOS_POR_JANELA) - timedelta(days=1)
        except ValueError:  # 29/02
            limite = date(ini.year + ANOS_POR_JANELA, 2, 28)
        janela_fim = min(limite, fim)
        yield ini, janela_fim
        ini = janela_fim + timedelta(days=1)


def interpretar(indicador: str, itens, hoje: date) -> list[Valor]:
    """Converte a resposta do SGS. Descarta datas futuras (a série 432 as publica)."""
    if not isinstance(itens, list):
        raise FormatoInesperado("SGS: resposta não é uma lista")
    valores = []
    for item in itens:
        try:
            dia = datetime.strptime(item["data"], "%d/%m/%Y").date()
            numero = float(str(item["valor"]).replace(",", "."))
        except (KeyError, TypeError, ValueError) as erro:
            raise FormatoInesperado(f"SGS: item inválido {item!r}") from erro
        if dia <= hoje:
            valores.append(Valor(indicador, dia, numero))
    return valores


def coletar(indicador: str, codigo: str, inicio: date, hoje: date) -> list[Valor]:
    valores: list[Valor] = []
    for ini, fim in janelas(inicio, hoje):
        url = URL.format(codigo=codigo, ini=ini.strftime("%d/%m/%Y"), fim=fim.strftime("%d/%m/%Y"))
        try:
            itens = baixar_json(url, aceitar_404=True)
        except SemDados:
            continue  # o SGS responde 404 quando não há dados na janela
        valores.extend(interpretar(indicador, itens, hoje))
    return valores
