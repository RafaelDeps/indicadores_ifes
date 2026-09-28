# Quickstart & Validation Guide: Python Hexagonal ETL Pipeline

**Feature Branch**: `008-python-hexagonal-etl`  
**Date**: 2026-09-25  
**Spec Reference**: [spec.md](./spec.md) | **Plan Reference**: [plan.md](./plan.md)

This guide documents runnable validation scenarios that demonstrate the Python ETL pipeline operating end-to-end, validating data fidelity against CONIF rules and contract compatibility with the Astro web dashboard.

---

## 1. Prerequisites

- **Python**: Version >= 3.11 (tested on Python 3.14).
- **Node.js**: Version >= 20.x (for Astro dashboard and Vitest).
- **Source Data**: `exports_canonical.zip` located at the root of the repository.

---

## 2. Environment Setup

Install Python development tooling (tests, formatting, linting):

```bash
# Create local virtualenv (recommended) and install requirements
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-etl.txt
```

Verify that development binaries are operational:

```bash
python3 -m pytest --version
python3 -m flake8 --version
python3 -m black --version
```

---

## 3. Validation Scenarios

### Scenario 1: Full Pipeline Execution (Global Package)

Generates the complete dataset for all 23 campuses plus consolidated `todos` for years 2024, 2025, and 2026 (216 files total).

```bash
# Run using Make target
make etl

# Or run directly via Python CLI
python3 -m etl.main --entrada exports_canonical.zip --saida indicadores.zip
```

**Expected Outcome**:

- Process terminates with exit code `0`.
- Output file `indicadores.zip` is created or replaced in the repository root.
- Verification command passes:
  ```bash
  python3 -c "import zipfile; z = zipfile.ZipFile('indicadores.zip'); assert len(z.namelist()) == 216, f'Expected 216 files, found {len(z.namelist())}'; print('Success: 216 files verified.')"
  ```

---

### Scenario 2: Single-Campus Filtered Execution

Executes the pipeline targeting exclusively a single campus without modifying `indicadores.zip`.

```bash
# Run for campus Serra
make etl-campus CAMPUS=Serra

# Or run directly via Python CLI
python3 -m etl.main --campus Serra --saida indicadores_serra.zip
```

**Expected Outcome**:

- Process terminates with exit code `0`.
- File `indicadores_serra.zip` contains exactly 9 files (3 pilares × 3 anos):
  ```bash
  python3 -c "import zipfile; z = zipfile.ZipFile('indicadores_serra.zip'); assert len(z.namelist()) == 9; print('Success: 9 campus files verified.')"
  ```
- File `indicadores.zip` remains untouched.

---

### Scenario 3: Execution of Python ETL Tests

Runs all unit and integration tests written in `pytest`.

```bash
make test-etl
```

**Expected Outcome**:

- All tests in `tests/etl/` execute and pass with 0 failures:
  - Resolution of campus hierarchy (declared -> coordinator -> team members).
  - Merged people registry and researcher collision precedence.
  - Activity window logic (`activity_filter.py`).
  - Strict null fidelity (Principle III) across Pilares 1, 2, 3.
  - Deterministic ZIP generation and checksum reproducibility.
  - CLI arguments and error scenarios.

---

### Scenario 4: Code Quality and Linting

Verifies styling and syntax rules mirroring `horizon_etl`.

```bash
# Check formatting
make format-check

# Run linter
make lint
```

**Expected Outcome**:

- `flake8`, `black --check`, and `isort --check` pass with 0 errors on `etl/` and `tests/etl/`.
- `eslint` and `prettier --check` pass on Astro frontend files.

---

### Scenario 5: Full System Integration Check

Runs the end-to-end integration check across both Python data engineering and Astro frontend presentation.

```bash
# 1. Run full CI check target
make check

# 2. Verify Astro static build
npm run build
```

**Expected Outcome**:

- Python tests and linter pass.
- Astro Vitest test suite passes all 267 tests against the newly generated `indicadores.zip`.
- Astro builds the static production distribution in `dist/` with 0 errors.
