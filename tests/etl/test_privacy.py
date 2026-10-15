from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path


def test_zero_pii_em_indicadores_zip() -> None:
    caminho_zip = Path("data/dist/indicadores.zip")
    assert caminho_zip.exists(), "data/dist/indicadores.zip deve existir"

    # Carrega nomes canônicos de pesquisadores para auditoria amostral
    nomes_pesquisadores: list[str] = []
    caminho_canonica = Path("data/canonical/exports_canonical.zip")
    if caminho_canonica.exists():
        with zipfile.ZipFile(caminho_canonica) as zf_can:
            # O pacote canônico pode ter o export aninhado (exports_canonical.zip
            # dentro de outro zip) ou flat (JSONs na raiz); detecta o layout.
            zf_fonte = zf_can
            if "exports_canonical.zip" in zf_can.namelist():
                zf_fonte = zipfile.ZipFile(
                    io.BytesIO(zf_can.read("exports_canonical.zip"))
                )
            try:
                pesquisadores = json.loads(
                    zf_fonte.read("researchers_canonical.json").decode("utf-8")
                )
            finally:
                if zf_fonte is not zf_can:
                    zf_fonte.close()
            nomes_pesquisadores = [
                p["name"] for p in pesquisadores[:50] if len(p.get("name", "")) > 5
            ]

    with zipfile.ZipFile(caminho_zip) as zf:
        for nome_arquivo in zf.namelist():
            texto = zf.read(nome_arquivo).decode("utf-8")
            dados = json.loads(texto)

            # 1. Auditoria de campos probitórios
            for pilar_dados in dados.get("indicadores", {}).values():
                assert "team" not in pilar_dados
                assert "autores" not in pilar_dados
                assert "pessoas" not in pilar_dados
                assert "pesquisadores" not in pilar_dados
                assert "estudantes" not in pilar_dados

            # 2. Auditoria amostral de nomes
            for nome_pesquisador in nomes_pesquisadores:
                assert (
                    nome_pesquisador not in texto
                ), f"Vazamento LGPD: '{nome_pesquisador}' encontrado em {nome_arquivo}"


def test_fixtures_auditoria_sem_padrao_cpf(tmp_path: Path) -> None:
    """Fixtures de auditoria não podem conter CPFs nem campos fora do contrato."""
    import re

    padrao_cpf = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")
    pasta_auditoria = Path("data/dist/auditoria")
    if not pasta_auditoria.exists():
        return

    for arquivo in pasta_auditoria.glob("*.json"):
        texto = arquivo.read_text(encoding="utf-8")
        assert not padrao_cpf.search(
            texto
        ), f"Padrão de CPF encontrado em {arquivo.name}"
        dados = json.loads(texto)
        for comp in dados.get("componentes", []):
            for reg in comp.get("registros", []):
                assert "cpf" not in reg
                assert "rg" not in reg
                assert "nascimento" not in reg
                assert "endereco" not in reg


def test_portao_fechado_limpa_public_auditoria(tmp_path: Path) -> None:
    """Quando o portão está fechado, public/auditoria deve ficar vazio (fail-closed)."""
    from etl.scripts.check_governanca import sincronizar_publico_auditoria

    pasta_publica = tmp_path / "public" / "auditoria"
    pasta_publica.mkdir(parents=True)
    (pasta_publica / "arquivo_vazado.json").write_text("{}", encoding="utf-8")

    pasta_dist = tmp_path / "dist" / "auditoria"
    pasta_dist.mkdir(parents=True)
    (pasta_dist / "PIES_serra_2025.json").write_text("{}", encoding="utf-8")

    # Portão fechado: limpa a saída
    sincronizar_publico_auditoria(
        portao_aberto=False, pasta_dist=pasta_dist, pasta_publica=pasta_publica
    )
    assert not any(
        pasta_publica.glob("*.json")
    ), "public/auditoria deve estar vazio com portão fechado"
