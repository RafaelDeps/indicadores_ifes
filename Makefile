# Indicadores IFES - Automação e Comandos de Desenvolvimento

SHELL := /bin/bash
.DEFAULT_GOAL := help

PYTHON_BIN ?= $(shell if [ -f .venv/bin/python ]; then echo .venv/bin/python; elif command -v python3 >/dev/null 2>&1; then echo python3; else echo python; fi)
PYTHON := PYTHONPATH=. $(PYTHON_BIN)

CAMPUS ?=
SAIDA ?=

.PHONY: help setup install dev build preview etl etl-campus etl-listagens merge-listagens test test-etl test-web test-watch lint format format-check check clean

help: ## Exibe os comandos disponíveis
	@echo "Indicadores IFES - Comandos disponíveis"
	@echo "========================================"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "%-18s %s\n", $$1, $$2}'

setup: ## Configura ambiente virtual e instala dependências de desenvolvimento do Python
	@python3 -m venv .venv
	@.venv/bin/pip install -r requirements-etl.txt
	npm install

install: ## Instala dependências do projeto frontend
	npm install

dev: ## Inicia o servidor de desenvolvimento do Astro
	npm run dev

build: ## Executa o build de produção do Astro
	npm run build

preview: ## Inicia o servidor de pré-visualização do Astro
	npm run preview

etl: ## Executa o pipeline Python de ETL gerando indicadores.zip (opcional: CAMPUS=Serra SAIDA=...)
	@args=""; \
	if [ -n "$(CAMPUS)" ]; then args="$$args --campus $(CAMPUS)"; fi; \
	if [ -n "$(SAIDA)" ]; then args="$$args --saida $(SAIDA)"; fi; \
	$(PYTHON) -m etl.main $$args

etl-campus: ## Executa o ETL para apenas 1 campus em zip dedicado (padrão: CAMPUS=Serra)
	@campus="$${CAMPUS:-Serra}"; \
	slug=$$(echo "$$campus" | tr '[:upper:]' '[:lower:]' | tr -d ' ' | sed 's/á/a/g;s/é/e/g;s/í/i/g;s/ó/o/g;s/ú/u/g;s/ã/a/g;s/õ/o/g;s/ç/c/g'); \
	saida="$${SAIDA:-data/dist/indicadores_$$slug.zip}"; \
	echo "Executando ETL em Python para o campus: $$campus (saída: $$saida)"; \
	$(PYTHON) -m etl.main --campus "$$campus" --saida "$$saida"

etl-listagens: ## Executa o ETL das listagens de matrícula gerando data/dist/indicadores_listagens.zip (Pilar 1: NTE e cotistas)
	$(PYTHON) -m etl.main_listagens

merge-listagens: ## Integra NTE/NTECPP das listagens em data/dist/indicadores.zip preservando todos os demais campos canônicos
	$(PYTHON) -m etl.scripts.merge_listagens_indicadores --listagens data/dist/indicadores_listagens.zip --canonical data/dist/indicadores.zip --saida data/dist/indicadores.zip

test: test-etl test-web ## Executa a suíte completa de testes automatizados (pytest e vitest)

test-etl: ## Executa exclusivamente os testes do pipeline ETL em Python com pytest
	@$(PYTHON) -m pytest -q tests/etl

test-web: ## Executa exclusivamente os testes do frontend Astro com vitest
	npm run test:web

test-watch: ## Executa os testes do frontend em modo interativo (watch)
	npm run test:watch

lint: ## Executa a verificação estática com flake8 (Python) e eslint (frontend)
	@echo "Executando flake8..."
	@$(PYTHON) -m flake8 etl tests/etl
	@echo "Executando eslint..."
	npm run lint

format: ## Formata o código com isort e black (Python) e prettier (frontend)
	@$(PYTHON) -m isort etl tests/etl
	@$(PYTHON) -m black etl tests/etl
	npm run format

format-check: ## Verifica a formatação do código (isort, black e prettier)
	@$(PYTHON) -m isort --check etl tests/etl
	@$(PYTHON) -m black --check etl tests/etl
	npm run format:check

check: lint format-check test ## Executa validação completa de CI (lint + formatação + testes)

clean: ## Limpa diretórios de build, cache e zips parciais de campus
	rm -rf dist .astro coverage .pytest_cache data/dist/indicadores_*.zip indicadores_*.zip
