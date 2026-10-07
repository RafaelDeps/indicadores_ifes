from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class AgregadosPilar1:
    """Métricas calculadas do Pilar 1 (Engajamento Acadêmico e Inclusão)."""

    ntpp_projetos_pesquisa_ativos: int = 0
    qspp_docentes_pesquisa: int = 0
    nep_estudantes_pesquisa: int = 0
    nte_total_estudantes_matriculados: int | None = None
    percentual_calculado_pies: None = None
    ntecpp_cotistas_pesquisa: int | None = None
    percentual_calculado_picot: None = None


@dataclass
class AgregadosPilar2:
    """Métricas do Pilar 2 (Fomento e Conexão com o Ecossistema)."""

    tafppi_valor_total_aporte_pesquisa: float | None = None
    occ_valor_orcamento_total_capital_custeio: None = None
    percentual_calculado_pinv: None = None
    nappct_acordos_parceria_firmados: int | None = None
    total_acumulado_pipdi: int | None = None


@dataclass
class AgregadosPilar3:
    """Métricas calculadas do Pilar 3 (Produtividade e Propriedade Intelectual)."""

    npb_producao_bibliografica: int = 0
    npb_artigos: int = 0
    npb_livros: int = 0
    npt_producao_tecnica: int = 0
    npt_produtos_tecnologicos: int = 0
    npt_processos_tecnologicos: int = 0
    pc_softwares: int = 0
    pa_patentes: int = 0
    total_transferidos_piprotr: None = None


@dataclass
class AgregadosCampus:
    """Contêiner de métricas dos 3 pilares para um campus em determinado ano."""

    campus_nome: str
    pilar1: AgregadosPilar1 = field(default_factory=AgregadosPilar1)
    pilar2: AgregadosPilar2 = field(default_factory=AgregadosPilar2)
    pilar3: AgregadosPilar3 = field(default_factory=AgregadosPilar3)
