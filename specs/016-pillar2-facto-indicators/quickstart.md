# Quickstart & Verification Guide: Pillar 2 FACTO Indicators Integration

**Feature**: `016-pillar2-facto-indicators`
**Date**: 2026-10-05

This guide provides runnable scenarios to verify the ingestion of FACTO data, metric computation for Pillar 2 (`PIPDI` and `PINV`), schema validation, and dashboard rendering.

---

## 1. Prerequisites

- Python 3.11+
- Node.js 18+
- Raw FACTO data in [`data/raw/pilar2/projetos.csv`](file:///home/rafael/indicadores_ifes/data/raw/pilar2/projetos.csv)
- Canonical exports in `data/canonical/exports_canonical.zip`

---

## 2. Test Execution (Unit & Integration)

Execute the automated test suite covering FACTO CSV parsing, campus resolution, temporal filtering, and schema adherence:

```bash
# Run all ETL tests including the new Pillar 2 test module
pytest tests/etl/test_facto_pilar2.py tests/etl/test_calculators.py -v
```

**Expected Result**:

- All tests pass with zero failures.
- Both presence and absence (fallback mode) of `data/raw/pilar2/` are validated.

---

## 3. End-to-End Pipeline Execution

Run the complete Python ETL pipeline:

```bash
python3 -m etl.main --anos 2024,2025,2026
```

**Expected Result**:

- The pipeline processes both canonical data and FACTO project records.
- Packages are generated in `data/dist/indicadores.zip`.
- An audit report is written to `data/reports/etl_run_report.md`.

---

## 4. Output Validation

Inspect generated Pillar 2 JSON files inside the resulting ZIP:

```bash
python3 -c "
import zipfile, json

with zipfile.ZipFile('data/dist/indicadores.zip') as zf:
    # Inspect Campus Serra 2025
    with zf.open('pilar2_serra_2025.json') as f:
        data = json.load(f)
        ind = data['indicadores']
        print('Serra 2025 PIPDI:', ind['PIPDI'])
        print('Serra 2025 PINV:', ind['PINV'])
        assert ind['PIPDI']['NAPPCT_acordos_parceria_firmados'] is not None

    # Inspect Institutional 'todos' 2025
    with zf.open('pilar2_todos_2025.json') as f:
        data = json.load(f)
        ind = data['indicadores']
        print('Todos 2025 PIPDI:', ind['PIPDI'])
        print('Todos 2025 PINV (TAFPPI):', ind['PINV']['TAFPPI_valor_total_aporte_pesquisa'])
        assert ind['PINV']['OCC_valor_orcamento_total_capital_custeio'] is None
        assert ind['PINV']['percentual_calculado_PINV'] is None
"
```

**Expected Outcome**:

- `PIPDI`: reports genuine non-negative integers for `NAPPCT_acordos_parceria_firmados` and `total_acumulado_PIPDI`.
- `PINV`: reports genuine float sum for `TAFPPI_valor_total_aporte_pesquisa` (if projects started in that year) and strictly `null` for `OCC` and `percentual_calculado_PINV`.

---

## 5. Frontend Visual Verification

Build and preview the Astro dashboard:

```bash
npm test
npm run build
npm run preview
```

Open `http://localhost:4321/pilar-2/` and verify:

1. Selecting **Pilar 2** in the navigation shows the cards for **PINV** and **PIPDI**.
2. **PIPDI** displays the calculated partnership agreement counts per campus and reference year.
3. **PINV** displays the captured research funding value (`TAFPPI`) with `OCC` and percentage showing as "Dado indisponível".
