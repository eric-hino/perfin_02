# -*- coding: utf-8 -*-
"""FBCF trimestral (IBGE/SIDRA, tabela 1846, valores correntes em R$ milhões)."""

from __future__ import annotations

from datetime import date

from .comum import FormatoInesperado, Valor, baixar_json

# Variável 585 = valores correntes; classificação 11255 / categoria 93406 = FBCF.
URL = "https://apisidra.ibge.gov.br/values/t/{tabela}/n1/all/v/585/p/all/c11255/93406?formato=json"


def chave_trimestre(cabecalho: dict) -> str:
    for chave, rotulo in cabecalho.items():
        if str(rotulo).strip().lower() == "trimestre (código)":
            return chave
    raise FormatoInesperado("SIDRA: coluna 'Trimestre (Código)' não encontrada")


def interpretar(indicador: str, linhas) -> list[Valor]:
    if not isinstance(linhas, list) or len(linhas) < 2:
        raise FormatoInesperado("SIDRA: resposta vazia ou inválida")
    chave = chave_trimestre(linhas[0])
    if "V" not in linhas[0]:
        raise FormatoInesperado("SIDRA: coluna de valor 'V' não encontrada")
    valores = []
    for linha in linhas[1:]:
        codigo = str(linha.get(chave, ""))
        texto = str(linha.get("V", "")).strip()
        if len(codigo) != 6 or not codigo.isdigit():
            raise FormatoInesperado(f"SIDRA: código de trimestre inválido {codigo!r}")
        try:
            numero = float(texto.replace(",", "."))
        except ValueError:
            continue  # '..', '-' = sem valor divulgado
        ano, trimestre = int(codigo[:4]), int(codigo[4:])
        if not 1 <= trimestre <= 4:
            raise FormatoInesperado(f"SIDRA: trimestre inválido {codigo!r}")
        valores.append(Valor(indicador, date(ano, 3 * (trimestre - 1) + 1, 1), numero))
    return valores


def coletar(indicador: str, tabela: str, inicio: date) -> list[Valor]:
    valores = interpretar(indicador, baixar_json(URL.format(tabela=tabela)))
    return [v for v in valores if v.data >= inicio]
