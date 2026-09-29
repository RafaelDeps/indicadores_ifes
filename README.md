# Indicadores IFES — Pesquisa e Inovação

Dashboard público para acompanhamento dos indicadores institucionais do modelo CONIF, destinado a gestores do IFES e à comunidade acadêmica. O projeto é composto por um pipeline de engenharia de dados em Python (`etl/`) inspirado no `horizon_etl` e uma interface web estática de alta performance construída em Astro (`src/`).

---

## 🏛️ Arquitetura do Repositório

O projeto segue a separação estrita de responsabilidades entre a gestão de dados, o processamento de indicadores e a interface de visualização:

```text
indicadores_ifes/
├── data/                       # Governança física e isolamento de dados
│   ├── canonical/              # Arquivos upstream brutos (gitignored, exceto .gitkeep)
│   │   └── exports_canonical.zip
│   ├── dist/                   # Artefatos processados para consumo
│   │   ├── indicadores.zip     # Pacote oficial consolidado (versionado no Git)
│   │   └── indicadores_*.zip   # Pacotes parciais de desenvolvimento/campus (gitignored)
│   └── reports/                # Observabilidade e auditoria
│       └── etl_run_report.md   # Relatório de execução sem PII (versionado no Git)
├── etl/                        # Pipeline de dados em Python (Arquitetura Hexagonal)
│   ├── core/
│   │   ├── logic/              # Modelos, calculadores de pilares e resoluções
│   │   └── ports/              # Interfaces abstratas ISource e ISink
│   ├── adapters/               # Adaptadores de entrada (zip canônico) e saída (zip/json)
│   ├── flows/                  # Orquestração do pipeline de indicadores
│   ├── tracking/               # Métricas de execução e conformidade LGPD
│   └── scripts/                # Utilitários diagnósticos e de inspeção
├── src/                        # Aplicação web estática em Astro
│   ├── components/             # Componentes de interface do usuário
│   ├── layouts/                # Estruturas de página base
│   ├── pages/                  # Rotas estáticas dos pilares e indicadores
│   ├── lib/                    # Consumo em memória de data/dist/indicadores.zip
│   └── styles/                 # Design tokens e tipografia
├── tests/                      # Segregação estrita de testes
│   ├── etl/                    # Suíte Pytest dedicada ao pipeline Python
│   └── web/                    # Suíte Vitest dedicada aos componentes e páginas Astro
├── Makefile                    # Automação unificada de desenvolvimento e CI local
└── pyproject.toml              # Configuração centralizada das ferramentas Python
```

---

## 🧭 Navegação da Aplicação Web

| Rota                | Conteúdo                                                         |
| :------------------ | :--------------------------------------------------------------- |
| `/`                 | Visão geral dos três pilares CONIF                               |
| `/pilar-1/`         | Engajamento Acadêmico e Inclusão (NTPP, QSPP, PIES, PICOT)       |
| `/pilar-1/<sigla>/` | Página de detalhe, gráficos e histórico do indicador             |
| `/pilar-2/`         | Fomento e Conexão com o Ecossistema (PINV, PIPDI)                |
| `/pilar-2/<sigla>/` | Detalhe do indicador de fomento/parcerias                        |
| `/pilar-3/`         | Produtividade e Propriedade Intelectual (PIPRO, PIPROT, PIPROTR) |
| `/pilar-3/<sigla>/` | Detalhe de produção científica e ativos de PI                    |

### Ano e Campus de Referência

- Nenhum valor é exibido sem um ano e campus explícitos; valores temporais nunca são somados.
- Filtros de navegação por campus e ano refletem na URL (`?campus=serra&ano=2025`).
- Indicadores sem apuração para determinado contexto exibem _"Dado indisponível"_ com justificativa textual fundamentada — nunca zero presumido ou estimativa arbitrária.

---

## 🛠️ Comandos de Desenvolvimento (`Makefile`)

A automação do projeto é centralizada no `Makefile`:

| Comando                        | Finalidade                                                                                 |
| :----------------------------- | :----------------------------------------------------------------------------------------- |
| `make setup`                   | Cria o ambiente virtual `.venv`, instala dependências Python e Node.js                     |
| `make etl`                     | Executa o pipeline Python lendo de `data/canonical/` e gerando `data/dist/indicadores.zip` |
| `make etl-campus CAMPUS=Serra` | Executa o pipeline para um campus individual gerando `data/dist/indicadores_<slug>.zip`    |
| `make test`                    | Executa a suíte de testes completa (`make test-etl` + `make test-web`)                     |
| `make test-etl`                | Executa exclusivamente os testes de dados com Pytest (`tests/etl/`)                        |
| `make test-web`                | Executa exclusivamente os testes do frontend com Vitest (`tests/web/`)                     |
| `make lint`                    | Executa análise estática com `flake8` (Python) e `eslint` (Astro/TS)                       |
| `make format`                  | Formata o código com `isort`, `black` e `prettier`                                         |
| `make format-check`            | Verifica a conformidade de estilo e formatação                                             |
| `make check`                   | Validação completa de CI local (`lint` + `format-check` + `test`)                          |
| `make dev`                     | Inicia o servidor local de desenvolvimento do Astro                                        |
| `make build`                   | Executa o build de produção estático do Astro em `dist/`                                   |
| `make clean`                   | Limpa caches, artefatos temporários e zips parciais de teste                               |

---

## 🔒 Governança de Dados, Fidelidade e LGPD

1. **Fidelidade Matemática Estrita (Princípio CONIF III)**:
   - Os cálculos dos 9 indicadores cobrem todos os escopos do export canônico (campi individuais + agregador "todos") ao longo dos anos de apuração (2024–2026); o número de arquivos no pacote `indicadores.zip` é **variável**, derivado do export vigente (nº de campi + `todos`, × 3 pilares × 3 anos).
   - Aplicação rigorosa das regras de nulidade: denominadores nulos resultam em `null` com motivo formal cadastrado.

2. **Privacidade e LGPD (Princípio CONIF IV)**:
   - O repositório e os pacotes de distribuição contêm exclusivamente dados agregados e desidentificados.
   - O módulo `etl/tracking/` sanitiza automaticamente qualquer identificador discente ou pessoal em logs e atestados de auditoria (`data/reports/etl_run_report.md`).
   - A fonte canônica (`exports_canonical.zip`, tamanho variável conforme o export) permanece estritamente isolada sob `data/canonical/` e é permanentemente ignorada pelo Git.
