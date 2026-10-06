# -*- coding: utf-8 -*-
"""
Curvas de juros da B3 (arquivo público "Taxas de Mercado para Swaps").

O download é um zip com um autoextraível (.ex_) que também é um zip e
contém o TaxaSwap.txt, de largura fixa. Curvas usadas:
    PRE -> pre (DI x Pré, % a.a. base 252)
    DIC -> ipca_real (DI x IPCA, cupom de IPCA, % a.a. base 252)
    DIM -> igpm_real (DI x IGP-M, cupom de IGP-M, % a.a. base 252)
    DOC -> cupom_cambial (DI x Dólar, cupom limpo, % a.a. linear 360)
"""

from __future__ import annotations

import io
import time
import zipfile
from datetime import date

from .comum import FormatoInesperado, PontoCurva, ResultadoDias, SemDados, baixar

URL = "https://www.b3.com.br/pesquisapregao/download?filelist=TS{aammdd}.ex_,"
PAUSA_S = 0.5

CURVAS = {"PRE": "pre", "DIC": "ipca_real", "DIM": "igpm_real", "DOC": "cupom_cambial"}
TAMANHO_LINHA = 72

# A grade da B3 tem 274 vértices até ~34 anos. Para caber no banco guardamos até
# 10 anos e afinamos: todos até 1 ano, 1 a cada 2 até 3 anos, 1 a cada 4 até 10 anos.
# A interpolação flat-forward entre os vértices mantidos segue válida.
LIMITE_DC = 3660
FAIXAS_AFINAMENTO = ((370, 1), (1100, 2), (LIMITE_DC, 4))


def afinar(pontos: list[PontoCurva]) -> list[PontoCurva]:
    """Reduz os vértices de cada curva, sempre mantendo o último dentro do limite."""
    mantidos: list[PontoCurva] = []
    por_curva: dict[str, list[PontoCurva]] = {}
    for p in pontos:
        if p.dias_corridos <= LIMITE_DC:
            por_curva.setdefault(p.curva, []).append(p)
    for lista in por_curva.values():
        lista.sort(key=lambda p: p.dias_corridos)
        contador = {limite: 0 for limite, _ in FAIXAS_AFINAMENTO}
        for i, p in enumerate(lista):
            limite, passo = next(f for f in FAIXAS_AFINAMENTO if p.dias_corridos <= f[0])
            if contador[limite] % passo == 0 or i == len(lista) - 1:
                mantidos.append(p)
            contador[limite] += 1
    return mantidos


def extrair_texto(conteudo: bytes) -> str:
    """Abre o zip externo e o autoextraível interno até chegar no TaxaSwap.txt."""
    try:
        externo = zipfile.ZipFile(io.BytesIO(conteudo))
        nomes = externo.namelist()
        if not nomes:
            raise SemDados("B3 swap: zip vazio")
        interno = zipfile.ZipFile(io.BytesIO(externo.read(nomes[0])))
        return interno.read("TaxaSwap.txt").decode("latin-1")
    except zipfile.BadZipFile as erro:
        # Sem arquivo para a data a B3 devolve uma resposta que não é zip.
        raise SemDados("B3 swap: arquivo não disponível para a data") from erro
    except KeyError as erro:
        raise FormatoInesperado("B3 swap: TaxaSwap.txt ausente") from erro


def interpretar_linha(linha: str) -> tuple[str, date, int, int, float]:
    """Layout B3: data 12-19, código 22-26, dias corridos 42-46, dias úteis 47-51, sinal 52, taxa 53-66 (7 decimais)."""
    if len(linha) < TAMANHO_LINHA - 1:
        raise FormatoInesperado(f"B3 swap: linha curta ({len(linha)} caracteres)")
    try:
        data_base = date(int(linha[11:15]), int(linha[15:17]), int(linha[17:19]))
        codigo = linha[21:26].strip()
        corridos, uteis = int(linha[41:46]), int(linha[46:51])
        sinal = -1 if linha[51] == "-" else 1
        taxa = sinal * int(linha[52:66]) / 10_000_000
    except ValueError as erro:
        raise FormatoInesperado(f"B3 swap: linha inválida {linha!r}") from erro
    if linha[51] not in "+-":
        raise FormatoInesperado(f"B3 swap: sinal inválido {linha[51]!r}")
    return codigo, data_base, corridos, uteis, taxa


def interpretar(texto: str, data_esperada: date) -> list[PontoCurva]:
    pontos = []
    for linha in texto.splitlines():
        if not linha.strip():
            continue
        codigo, data_base, corridos, uteis, taxa = interpretar_linha(linha)
        if codigo not in CURVAS:
            continue
        if data_base != data_esperada:
            raise FormatoInesperado(f"B3 swap: data {data_base} diferente da pedida {data_esperada}")
        pontos.append(PontoCurva(data_base, CURVAS[codigo], corridos, uteis, taxa))
    if not any(p.curva == "pre" for p in pontos):
        raise FormatoInesperado("B3 swap: curva PRE ausente")
    return pontos


def coletar_dia(dia: date) -> list[PontoCurva]:
    conteudo = baixar(URL.format(aammdd=dia.strftime("%y%m%d")))
    return afinar(interpretar(extrair_texto(conteudo), dia))


def coletar(dias_uteis: list[date]) -> ResultadoDias:
    """Falha de rede num dia não perde os outros; mudança de formato interrompe."""
    resultado = ResultadoDias()
    for dia in dias_uteis:
        try:
            resultado.itens.extend(coletar_dia(dia))
        except SemDados:
            pass
        except ConnectionError:
            resultado.dias_com_falha.append(dia)
        except FormatoInesperado as erro:
            resultado.erro_formato = erro
            break
        time.sleep(PAUSA_S)
    return resultado
