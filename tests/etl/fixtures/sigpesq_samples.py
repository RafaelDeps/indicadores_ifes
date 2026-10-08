"""Fixtures e dados sintéticos de projetos SIGPESQ para testes de vigência plurianual e financiamento."""

from __future__ import annotations

from etl.core.logic.models.pillar2_models import (
    FonteFinanciamento,
    ProjetoSigpesqFinanciamento,
)

MOCK_SIGPESQ_PLURIANUAIS_RAW: dict[str, dict] = {
    "project_sigpesq_files_json/PJ_8504.json": {
        "codigo": "PJ 8504",
        "titulo": "Centro Temático de IA e Tecnologias Cognitivas",
        "coordenador": {
            "nome": "Karin Satie Komati",
            "campus": "Serra",
        },
        "datas": {
            "inicio": "2025-01-15",
            "fim": None,
            "duracao_meses": 36,
        },
        "financiamento": {
            "valor_total": 15000000.0,
            "moeda": "BRL",
            "fontes": [
                {
                    "fonte": "FINEP",
                    "valor": 15000000.0,
                    "tipo": "Financiamento público",
                }
            ],
        },
    },
    "project_sigpesq_files_json/PJ_9536.json": {
        "codigo": "PJ 9536",
        "titulo": "Detecção de Deepfakes e Mídias Manipuladas",
        "coordenador": {
            "nome": "Pesquisador Serra",
            "campus": "Ifes – Campus Serra",
        },
        "datas": {
            "inicio": "2025-06-01",
            "fim": None,
            "duracao_meses": 24,
        },
        "financiamento": {
            "valor_total": 150000.0,
            "moeda": "BRL",
            "fontes": [
                {
                    "fonte": "FAPES",
                    "valor": 150000.0,
                    "tipo": "Edital Universal",
                }
            ],
        },
    },
    "project_sigpesq_files_json/PJ_FALLBACK.json": {
        "codigo": "PJ FALLBACK",
        "titulo": "Projeto Sem Fim e Sem Duração",
        "coordenador": {
            "nome": "Pesquisador Local",
            "campus": "Serra",
        },
        "datas": {
            "inicio": "2024-03-01",
            "fim": None,
            "duracao_meses": None,
        },
        "financiamento": {
            "valor_total": 50000.0,
            "moeda": "BRL",
            "fontes": [
                {
                    "fonte": "FAPES",
                    "valor": 50000.0,
                    "tipo": "Bolsa",
                }
            ],
        },
    },
}


def criar_projeto_sigpesq_sample(
    codigo: str = "PJ 1000",
    campus_slug: str = "serra",
    ano_inicio: int = 2025,
    duracao_meses: int | None = 36,
    ano_fim: int | None = 2027,
    valor_total: float = 1000000.0,
    fonte: str = "FINEP",
) -> ProjetoSigpesqFinanciamento:
    """Cria instância de ProjetoSigpesqFinanciamento para uso em testes."""
    return ProjetoSigpesqFinanciamento(
        codigo=codigo,
        titulo=f"Projeto de Teste {codigo}",
        campus_slug=campus_slug,
        campus_nome="Serra" if campus_slug == "serra" else "Vitória",
        ano_inicio=ano_inicio,
        ano_fim=ano_fim,
        duracao_meses=duracao_meses,
        valor_total=valor_total,
        fontes=[FonteFinanciamento(fonte=fonte, valor=valor_total)],
    )
