# -*- coding: utf-8 -*-
"""Tipos e utilitários comuns às fontes de dados."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import date

USER_AGENT = "Mozilla/5.0 (Portal Perfin - coletor de indicadores; uso interno)"
TIMEOUT_S = 60
TENTATIVAS = 4


class FormatoInesperado(Exception):
    """A fonte respondeu num formato diferente do esperado. Nada é gravado."""


class SemDados(Exception):
    """A fonte não tem dados para a data pedida (feriado, ainda não publicado)."""


@dataclass(frozen=True)
class Valor:
    indicador: str
    data: date
    valor: float


@dataclass
class ResultadoDias:
    """Coleta dia a dia: itens obtidos, dias que falharam e erro de formato (que interrompe)."""
    itens: list = field(default_factory=list)
    dias_com_falha: list = field(default_factory=list)
    erro_formato: Exception | None = None


@dataclass(frozen=True)
class PontoCurva:
    data_base: date
    curva: str            # pre | ipca_real | igpm_real | cupom_cambial
    dias_corridos: int
    dias_uteis: int
    taxa: float           # % a.a.


def baixar(url: str, dados: bytes | None = None, aceitar_404: bool = False) -> bytes:
    """GET (ou POST, com `dados`) com novas tentativas e espera crescente."""
    ultimo_erro: Exception | None = None
    for tentativa in range(1, TENTATIVAS + 1):
        try:
            req = urllib.request.Request(url, data=dados, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
                return resp.read()
        except urllib.error.HTTPError as erro:
            if erro.code == 404 and aceitar_404:
                raise SemDados(url) from erro
            ultimo_erro = erro
        except (urllib.error.URLError, TimeoutError, ConnectionError) as erro:
            ultimo_erro = erro
        time.sleep(2 * tentativa)
    raise ConnectionError(f"falha ao acessar {url}: {ultimo_erro}")


def baixar_json(url: str, aceitar_404: bool = False):
    """
    Baixa e interpreta JSON. Algumas APIs (BCB) respondem, de forma intermitente,
    uma página HTML de erro com status 200: isso é tratado como falha temporária.
    """
    for tentativa in range(1, TENTATIVAS + 1):
        conteudo = baixar(url, aceitar_404=aceitar_404)
        try:
            return json.loads(conteudo.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            time.sleep(3 * tentativa)
    raise FormatoInesperado(f"resposta não é JSON após {TENTATIVAS} tentativas: {url}")


def numero_br(texto: str | None) -> float | None:
    """'1.234,56' -> 1234.56; vazio, '--' ou '-' -> None."""
    s = (texto or "").strip()
    if s in ("", "-", "--", "..."):
        return None
    try:
        return float(s.replace(".", "").replace(",", "."))
    except ValueError as erro:
        raise FormatoInesperado(f"número inválido: {texto!r}") from erro
