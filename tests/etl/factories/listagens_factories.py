from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook

# Contrato de entrada verificado: as 8 colunas exatas, cabeçalho na linha 3.
HEADER_LISTAGEM = (
    "Matrícula",
    "Nome",
    "Curso",
    "Situação Matrícula",
    "Sexo",
    "Nascimento",
    "Desc_Forma_Ingresso_Matricula",
    "Desc_Cota",
)

# Formas de ingresso/cota típicas usadas nos testes (classificacao_cota.md).
INGRESSO_AMPLA = "Ampla Concorrência"
INGRESSO_COTA = "PS - Ação Afirmativa 1 - PPI"
INGRESSO_M9 = "M9 - Enem - Ampla Concorrência"
COTA_NENHUMA = "Não possui"
COTA_AMPLA = "Ampla Concorrência"
COTA_RESERVA = "Aluno de Escola Pública com renda <= 1,5 SM por pessoa"
COTA_RESERVA_PPI = (
    "Aluno de Escola Pública com renda <= 1,5 SM por pessoa, "
    "autodeclarado preto, pardo ou indígena"
)


def linha(
    matricula: str | int,
    nome: str = "Aluno Reservado",
    curso: str = "Técnico em Informática",
    situacao: str = "Matriculado",
    sexo: str = "F",
    nascimento: str = "2004-05-01",
    forma_ingresso: str | None = INGRESSO_AMPLA,
    cota: str | None = COTA_NENHUMA,
) -> list[str | int | None]:
    """Linha de planilha no contrato de 8 colunas. Padrão: NÃO cotista."""
    return [
        matricula,
        nome,
        curso,
        situacao,
        sexo,
        nascimento,
        forma_ingresso,
        cota,
    ]


def linha_cotista(matricula: str | int, **kwargs) -> list[str | int | None]:
    """Linha com ingresso E cota de reserva de vagas (cotista por convenção)."""
    params = dict(kwargs)
    params.setdefault("forma_ingresso", INGRESSO_COTA)
    params.setdefault("cota", COTA_RESERVA_PPI)
    return linha(matricula, **params)


def criar_listagem_xlsx(
    caminho: Path,
    ano: int,
    semestre: int,
    campus: str = "Serra",
    linhas: list[list[str | int | None]] | None = None,
    titulo: str | None = None,
    cabecalho: tuple[str, ...] | None = None,
) -> Path:
    """Escreve um `.xlsx` de listagem no formato esperado pelo ETL."""
    wb = Workbook()
    ws = wb.active
    titulo_efetivo = (
        titulo
        if titulo is not None
        else (f"Campus {campus} – Todos os Cursos - Semestres letivo: {ano}/{semestre}")
    )
    ws.append([titulo_efetivo])
    ws.append([])  # linha 2 vazia
    ws.append(list(cabecalho or HEADER_LISTAGEM))
    for linha_linhas in linhas or []:
        ws.append(list(linha_linhas))
    caminho.parent.mkdir(parents=True, exist_ok=True)
    wb.save(caminho)
    return caminho
