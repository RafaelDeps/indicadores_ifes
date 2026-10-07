# Data Model: Pillar 2 FACTO Indicators Integration

**Feature**: `016-pillar2-facto-indicators`
**Date**: 2026-10-05

## 1. Domain Entities & Value Objects

### 1.1 `ProjetoFacto` (Domain Entity)

Represents an individual project extracted from the foundation portal (`data/raw/pilar2/projetos.csv`).

```python
from dataclasses import dataclass
from datetime import date

@dataclass(frozen=True)
class ProjetoFacto:
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
        tipo = self.tipo_projeto.lower()
        if any(term in tipo for term in ["processo seletivo", "concurso"]):
            return False
        if tipo.strip() in ["ensino", "extensao", "extensão"]:
            return False
        return any(term in tipo for term in ["pesquisa", "inovacao", "inovação", "desenvolvimento"])

    @property
    def eh_parceria(self) -> bool:
        """Verifica se há instrumento jurídico ou parceiro externo caracterizando parceria."""
        if not self.eh_pdei:
            return False
        instr = self.instrumento_juridico.lower().strip()
        parceria_keywords = ["convenio", "convênio", "acordo", "contrato", "cooperacao", "cooperação"]
        if any(kw in instr for kw in parceria_keywords):
            return True
        # Se instrumento em branco, mas tem financiadora/parceiro externo cadastrado
        return bool(self.financiadora.strip())

    def ativo_em_ano(self, ano: int) -> bool:
        """Verifica vigência do projeto no ano de referência."""
        if not self.data_inicio:
            return False
        inicio_ano = self.data_inicio.year
        fim = self.data_vigencia or self.data_encerramento
        fim_ano = fim.year if fim else 9999
        return inicio_ano <= ano <= fim_ano
```

### 1.2 `AgregadosPilar2` (Domain Aggregates)

Updated in `etl/core/logic/models/indicators.py` to allow genuine metrics while holding uncollected values as strictly `None`.

```python
@dataclass
class AgregadosPilar2:
    """Métricas consolidadas do Pilar 2 (Fomento e Conexão com o Ecossistema)."""
    tafppi_valor_total_aporte_pesquisa: float | None = None
    occ_valor_orcamento_total_capital_custeio: None = None
    percentual_calculado_pinv: None = None
    nappct_acordos_parceria_firmados: int | None = None
    total_acumulado_pipdi: int | None = None
```

---

## 2. Spatial & Campus Mapping Rules

| Input `Instituição executora`                   | Condition                    | Target Campus Slugs  |
| :---------------------------------------------- | :--------------------------- | :------------------- |
| `Instituto Federal ... - Campus <Nome>`         | Matches known IFES campus    | `[<slug>, "todos"]`  |
| `Instituto Federal ... - Reitoria`              | Title contains `"CEFOR"`     | `["cefor", "todos"]` |
| `Instituto Federal ... - Reitoria`              | General / multi-campus title | `["todos"]`          |
| External Institution (e.g. IFSP, IFFar, ICMBio) | External entity              | `[]` (Omitted)       |

---

## 3. Metrics Calculation Logic

For each target reference year $Y \in \{2024, 2025, 2026\}$ and campus slug $S$:

1. **`NAPPCT_acordos_parceria_firmados` / `total_acumulado_PIPDI`**:
   $$\text{NAPPCT}(S, Y) = \sum \{ 1 \mid P \in \text{Projetos}, S \in P.\text{campus\_slugs}, P.\text{eh\_parceria}, P.\text{ativo\_em\_ano}(Y) \}$$
   - If raw FACTO data was processed: output the integer count ($\ge 0$).
   - If raw FACTO data was missing (fallback mode): output `None`.

2. **`TAFPPI_valor_total_aporte_pesquisa`**:
   $$\text{TAFPPI}(S, Y) = \sum \{ P.\text{valor\_aprovado} \mid P \in \text{Projetos}, S \in P.\text{campus\_slugs}, P.\text{eh\_pdei}, P.\text{ano\_inicio} == Y \}$$
   - If funding projects exist: output the float sum rounded to 2 decimal places.
   - If 0 funding projects in year: output `None` (rendered as "Dado indisponível").

3. **`OCC` & `PINV`**:
   - `occ_valor_orcamento_total_capital_custeio` = `None`
   - `percentual_calculado_pinv` = `None`
     (Principle III compliance: no budget interpolation).
