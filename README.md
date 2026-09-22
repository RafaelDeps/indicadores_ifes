# Indicadores IFES — Pesquisa e Inovação

Dashboard público para acompanhar os indicadores do modelo CONIF, destinado a
gestores da IFES e à comunidade. O Pilar 1 (Pesquisa e Inovação) está
disponível; os Pilares 2 e 3 entram como "em breve".

## Navegação

| Rota                | Conteúdo                                              |
| ------------------- | ----------------------------------------------------- |
| `/`                 | Visão geral dos pilares                               |
| `/pilar-1/`         | Os 4 indicadores do Pilar 1 (NTPP, QSPP, PIES, PICOT) |
| `/pilar-1/<sigla>/` | Página de detalhe do indicador                        |

O padrão `/pilar-<n>/<sigla>/` será reutilizado pelos próximos pilares.

## Ano de referência

- Nenhum valor é exibido sem um ano explícito; os anos nunca são somados.
- O ano selecionado aparece na URL (`?ano=2025`): links compartilháveis e
  botões voltar/avançar funcionam.
- Padrão: 2025 (último ano fechado). 2026 permanece selecionável e é
  rotulado como ano em andamento (dados parciais).
- Ano inválido na URL recai no padrão; indicador sem dados (PIES, PICOT)
  mostra "Dado indisponível" em qualquer ano — nunca zero ou estimativa.

## Exportação

Cada página de indicador oferece `Baixar CSV` e `Baixar JSON`:

- CSV: UTF-8 com BOM, separador `;`, colunas `ano;valor;motivo` (e seções
  `ano;quantidade;motivo` por componente, quando existirem).
- JSON: o próprio arquivo de dados curado no repositório
  (`src/data/<sigla>.json`).

## Identidade visual

Identidade própria (sem vínculo de marca com outros projetos): paleta
indigo com variantes clara e escura em `src/styles/tokens.css` (fonte única
de todas as cores), tipografia Source Sans 3 auto-hospedada em
`public/fonts/` e monograma "IF". O modo escuro segue automaticamente a
preferência do sistema — não há controles de tema/contraste/fonte na
interface. Cartões usam superfície com borda de 1px, sem sombras
decorativas. Texto da interface em registro institucional sóbrio (pt-BR).

## Sobre os dados

- Os valores exibidos são **exatamente** os transcritos do relatório oficial —
  nada é inventado ou estimado.
- Apenas dados agregados: nenhum dado individual (nomes, CPF etc.) entra
  neste repositório.
- Edição de dados pela interface **não** existe: atualizações são feitas
  editando os arquivos JSON em `src/data/` e enviando um commit.

## Como atualizar os dados

1. Edite o JSON do indicador em `src/data/{sigla}.json` (contrato em
   `specs/001-pillar1-indicators-dashboard/contracts/data-contract.md`).
2. Valor sem dado = `valor: null` + `motivoIndisponivel` explicando o que
   falta. Nunca use `0` para representar ausência de dado.
3. Atualize `dataAtualizacao` com a data (`YYYY-MM-DD`) da edição do
   relatório.
4. Abra um pull request: os testes de validação dos dados rodam no CI antes
   de qualquer publicação.

## Comandos

| Comando                | Finalidade                        |
| ---------------------- | --------------------------------- |
| `npm install`          | Instala as dependências           |
| `npm run dev`          | Servidor de desenvolvimento local |
| `npm run test`         | Testes unitários (Vitest)         |
| `npm run lint`         | ESLint                            |
| `npm run format:check` | Verifica a formatação (Prettier)  |
| `npm run build`        | Gera o site estático em `dist/`   |
| `npm run preview`      | Serve o build para validação      |

## Publicação

O deploy para o GitHub Pages é automático via GitHub Actions e acontece
somente depois de lint, formatação, testes e build passarem
(`.github/workflows/deploy.yml`).
