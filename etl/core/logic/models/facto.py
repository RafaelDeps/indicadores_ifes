from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class ProjetoFacto:
    """Representa um projeto da FACTO (Fundação de Apoio ao IFES)."""

    id: str
    referencia: str
    coordenador: str
    financiadora: str
    data_inicio: date | None
    data_vigencia: date | None
    data_encerramento: date | None
    tipo_projeto: str
    categoria_projeto: str
    instrumento_juridico: str
    instituicao_executora: str
    departamento: str
    processo: str
    valor_aprovado: float
    objetivo: str
    campus_slugs: tuple[str, ...]

    @property
    def ano_inicio(self) -> int | None:
        return self.data_inicio.year if self.data_inicio else None

    @property
    def eh_pdei(self) -> bool:
        """Verifica se o tipo de projeto corresponde a PDeI (Pesquisa, Desenvolvimento e Inovação)."""
        tipo = self.tipo_projeto.lower().strip()
        if any(term in tipo for term in ["processo seletivo", "concurso"]):
            return False
        if tipo in ["ensino", "extensao", "extensão"]:
            return False
        return any(
            term in tipo
            for term in ["pesquisa", "inovacao", "inovação", "desenvolvimento"]
        )

    @property
    def eh_parceria(self) -> bool:
        """Verifica se há instrumento jurídico ou parceiro externo caracterizando parceria."""
        if not self.eh_pdei:
            return False
        instr = self.instrumento_juridico.lower().strip()
        parceria_keywords = [
            "convenio",
            "convênio",
            "acordo",
            "contrato",
            "cooperacao",
            "cooperação",
        ]
        if any(kw in instr for kw in parceria_keywords):
            return True
        # Se instrumento em branco, mas tem financiadora/parceiro externo cadastrado
        return bool(self.financiadora.strip())

    def ativo_em_ano(self, ano: int) -> bool:
        """Verifica vigência do projeto no ano de referência."""
        if not self.data_inicio:
            return False
        inicio_ano = self.data_inicio.year
        datas_fim = [
            d for d in (self.data_vigencia, self.data_encerramento) if d is not None
        ]
        fim_ano = max(d.year for d in datas_fim) if datas_fim else 9999
        return inicio_ano <= ano <= fim_ano
