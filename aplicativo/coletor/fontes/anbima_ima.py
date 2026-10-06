# -*- coding: utf-8 -*-
"""
IMA-B (ANBIMA): número-índice, taxa indicativa (yield IPCA+) e duration.

Usa o download público de resultados diários do IMA, uma data por requisição.
"""

from __future__ import annotations

import csv
import io
import time
import urllib.parse
from datetime import date, datetime

from .comum import FormatoInesperado, ResultadoDias, SemDados, Valor, baixar, numero_br

URL = "https://www.anbima.com.br/informacoes/ima/ima-sh-down.asp"
PAUSA_S = 0.4

COLUNA_INDICE = "Índice"
COLUNA_DATA = "Data de Referência"
COLUNA_NUMERO = "Número Índice"
COLUNA_DURATION = "Duration(d.u.)"
COLUNA_YIELD = "Yield"


def corpo_requisicao(dia: date) -> bytes:
    campos = {
        "Tipo": "", "DataRef": "", "Pai": "ima", "Dt_Ref": dia.strftime("%d/%m/%Y"),
        "Dt_Ref_Ver": "", "Idioma": "PT", "saida": "csv", "escolha": "2", "Indice": "IMA-B",
    }
    return urllib.parse.urlencode(campos).encode()


def interpretar(texto: str, indice: str, codigos: dict[str, str]) -> list[Valor]:
    """
    `codigos` mapeia o campo para o código do indicador, por exemplo
    {"numero": "imab", "yield": "imab_yield", "duration": "imab_duration"}.
    """
    linhas = [l for l in texto.splitlines() if ";" in l]
    if not linhas:
        raise SemDados("ANBIMA: arquivo sem dados para a data")
    leitor = csv.DictReader(io.StringIO("\n".join(linhas)), delimiter=";")
    esperadas = {COLUNA_INDICE, COLUNA_DATA, COLUNA_NUMERO, COLUNA_DURATION, COLUNA_YIELD}
    faltando = esperadas - set(leitor.fieldnames or [])
    if faltando:
        raise FormatoInesperado(f"ANBIMA: colunas ausentes {sorted(faltando)}")
    for linha in leitor:
        if (linha[COLUNA_INDICE] or "").strip() != indice:
            continue
        dia = datetime.strptime(linha[COLUNA_DATA].strip(), "%d/%m/%Y").date()
        campos = {
            "numero": numero_br(linha[COLUNA_NUMERO]),
            "yield": numero_br(linha[COLUNA_YIELD]),
            "duration": numero_br(linha[COLUNA_DURATION]),
        }
        return [Valor(codigos[c], dia, v) for c, v in campos.items() if c in codigos and v is not None]
    raise SemDados(f"ANBIMA: índice {indice} ausente no arquivo")


def coletar_dia(dia: date, indice: str, codigos: dict[str, str]) -> list[Valor]:
    texto = baixar(URL, dados=corpo_requisicao(dia)).decode("cp1252")
    return interpretar(texto, indice, codigos)


def coletar(dias_uteis: list[date], indice: str, codigos: dict[str, str]) -> ResultadoDias:
    """Falha de rede num dia não perde os outros; mudança de formato interrompe."""
    resultado = ResultadoDias()
    for dia in dias_uteis:
        try:
            resultado.itens.extend(coletar_dia(dia, indice, codigos))
        except SemDados:
            pass  # dia sem publicação (ainda não divulgado ou feriado local)
        except ConnectionError:
            resultado.dias_com_falha.append(dia)
        except FormatoInesperado as erro:
            resultado.erro_formato = erro
            break
        time.sleep(PAUSA_S)
    return resultado
