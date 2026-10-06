# -*- coding: utf-8 -*-
"""Testes das fontes com amostras reais salvas em testes/fixtures."""

import json
from datetime import date

import pytest
from conftest import FIXTURES

from fontes import anbima_ima, b3_indices, b3_taxas_swap, bcb_sgs, ibge_sidra
from fontes.comum import FormatoInesperado, SemDados, numero_br

HOJE = date(2026, 10, 6)


# --- utilitários -------------------------------------------------------------

def test_numero_br_converte_formato_brasileiro():
    assert numero_br("1.234,56") == 1234.56
    assert numero_br("--") is None
    assert numero_br("") is None


def test_numero_br_rejeita_texto():
    with pytest.raises(FormatoInesperado):
        numero_br("abc")


# --- BCB/SGS -----------------------------------------------------------------

def test_sgs_descarta_datas_futuras():
    itens = [{"data": "05/10/2026", "valor": "13.75"}, {"data": "02/11/2026", "valor": "13.75"}]
    valores = bcb_sgs.interpretar("selic_meta", itens, HOJE)
    assert [v.data for v in valores] == [date(2026, 10, 5)]


def test_sgs_rejeita_item_sem_valor():
    with pytest.raises(FormatoInesperado):
        bcb_sgs.interpretar("ipca", [{"data": "01/09/2026"}], HOJE)


def test_sgs_divide_em_janelas_de_cinco_anos():
    janelas = list(bcb_sgs.janelas(date(2000, 1, 1), date(2026, 10, 6)))
    assert janelas[0] == (date(2000, 1, 1), date(2004, 12, 31))
    assert janelas[-1][1] == date(2026, 10, 6)
    assert len(janelas) == 6


# --- IBGE/SIDRA ----------------------------------------------------------------

def test_sidra_converte_trimestre_em_primeiro_dia():
    linhas = json.loads((FIXTURES / "sidra_fbcf.json").read_text(encoding="utf-8"))
    valores = ibge_sidra.interpretar("fbcf", linhas)
    assert valores, "a amostra deve ter trimestres com valor"
    assert all(v.data.day == 1 and v.data.month in (1, 4, 7, 10) for v in valores)


def test_sidra_sem_coluna_de_trimestre_falha():
    with pytest.raises(FormatoInesperado):
        ibge_sidra.interpretar("fbcf", [{"V": "Valor"}, {"V": "1"}])


# --- B3 índices (Ibovespa) ------------------------------------------------------

def test_ibovespa_le_matriz_dia_por_mes():
    resposta = json.loads((FIXTURES / "ibov_2026.json").read_text(encoding="utf-8"))
    valores = {v.data: v.valor for v in b3_indices.interpretar("ibovespa", 2026, resposta, HOJE)}
    assert valores[date(2026, 1, 2)] == 160538.69
    assert all(d <= HOJE for d in valores)


def test_ibovespa_sem_results_falha():
    with pytest.raises(FormatoInesperado):
        b3_indices.interpretar("ibovespa", 2026, {"erro": "x"}, HOJE)


# --- ANBIMA (IMA-B) ---------------------------------------------------------------

def test_imab_le_numero_yield_e_duration():
    texto = (FIXTURES / "imah.csv").read_text(encoding="cp1252")
    valores = {v.indicador: v for v in anbima_ima.interpretar(texto, "IMA-B", anbima_ima_codigos())}
    assert valores["imab"].valor == 11691.238773
    assert valores["imab_yield"].valor == 7.6851
    assert valores["imab_duration"].valor == 1711
    assert valores["imab"].data == date(2026, 9, 1)


def test_imab_sem_colunas_esperadas_falha():
    with pytest.raises(FormatoInesperado):
        anbima_ima.interpretar("Indice;Data\nIMA-B;01/09/2026\n", "IMA-B", anbima_ima_codigos())


def test_imab_arquivo_vazio_indica_sem_dados():
    with pytest.raises(SemDados):
        anbima_ima.interpretar("Nenhum dado encontrado", "IMA-B", anbima_ima_codigos())


def anbima_ima_codigos():
    return {"numero": "imab", "yield": "imab_yield", "duration": "imab_duration"}


# --- B3 curvas (TaxaSwap) ---------------------------------------------------------

def test_taxa_swap_le_curvas_usadas():
    texto = (FIXTURES / "TaxaSwap_amostra.txt").read_text(encoding="latin-1")
    pontos = b3_taxas_swap.interpretar(texto, date(2026, 10, 2))
    curvas = {p.curva for p in pontos}
    assert curvas == {"pre", "ipca_real", "igpm_real", "cupom_cambial"}
    primeiro_pre = next(p for p in pontos if p.curva == "pre")
    assert (primeiro_pre.dias_corridos, primeiro_pre.dias_uteis, primeiro_pre.taxa) == (3, 1, 13.65)


def test_taxa_swap_le_taxa_negativa():
    linha = "0000010010120261002T1DOL  DIxDOL         0000300001-00000304490000F00001"
    _, _, _, _, taxa = b3_taxas_swap.interpretar_linha(linha)
    assert taxa == pytest.approx(-30.449)


def test_taxa_swap_data_diferente_falha():
    texto = (FIXTURES / "TaxaSwap_amostra.txt").read_text(encoding="latin-1")
    with pytest.raises(FormatoInesperado):
        b3_taxas_swap.interpretar(texto, date(2026, 10, 1))


def test_taxa_swap_resposta_nao_zip_indica_sem_dados():
    with pytest.raises(SemDados):
        b3_taxas_swap.extrair_texto(b"<html>arquivo inexistente</html>")


def test_afinar_limita_prazo_e_mantem_ultimo_vertice():
    pontos = [b3_taxas_swap.PontoCurva(date(2026, 10, 2), "pre", dc, dc // 2, 13.0) for dc in range(1, 5000, 10)]
    mantidos = b3_taxas_swap.afinar(pontos)
    assert max(p.dias_corridos for p in mantidos) <= b3_taxas_swap.LIMITE_DC
    curtos = [p for p in pontos if p.dias_corridos <= 370]
    assert all(p in mantidos for p in curtos)
    assert len(mantidos) < len([p for p in pontos if p.dias_corridos <= b3_taxas_swap.LIMITE_DC])
    ultimo_no_limite = max(p.dias_corridos for p in pontos if p.dias_corridos <= b3_taxas_swap.LIMITE_DC)
    assert ultimo_no_limite in {p.dias_corridos for p in mantidos}


def test_coleta_por_dia_nao_perde_os_dias_bons(monkeypatch):
    dias = [date(2026, 10, 1), date(2026, 10, 2), date(2026, 10, 5)]
    ponto = b3_taxas_swap.PontoCurva(date(2026, 10, 1), "pre", 3, 1, 13.0)

    def falso(dia):
        if dia == date(2026, 10, 2):
            raise ConnectionError("fora do ar")
        return [ponto]

    monkeypatch.setattr(b3_taxas_swap, "coletar_dia", falso)
    monkeypatch.setattr(b3_taxas_swap, "PAUSA_S", 0)
    resultado = b3_taxas_swap.coletar(dias)
    assert len(resultado.itens) == 2
    assert resultado.dias_com_falha == [date(2026, 10, 2)]
    assert resultado.erro_formato is None


def test_coleta_por_dia_para_quando_o_formato_muda(monkeypatch):
    def falso(dia):
        raise FormatoInesperado("mudou")

    monkeypatch.setattr(b3_taxas_swap, "coletar_dia", falso)
    monkeypatch.setattr(b3_taxas_swap, "PAUSA_S", 0)
    resultado = b3_taxas_swap.coletar([date(2026, 10, 1), date(2026, 10, 2)])
    assert resultado.itens == [] and isinstance(resultado.erro_formato, FormatoInesperado)
