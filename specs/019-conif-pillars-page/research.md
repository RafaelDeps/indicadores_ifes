# Research & Architecture Decisions: Nova Página dos Pilares CONIF (Campus Serra)

**Feature**: `specs/019-conif-pillars-page`  
**Data**: 2026-10-09  
**Status**: Concluído

---

## 1. Decisão de Rota e Estrutura de Arquivos

### Decisão

Utilizar a rota canônica `/sobre-conif/`, implementada fisicamente como `src/pages/sobre-conif/index.astro`.

### Justificativa

- O projeto adota a convenção de rotas em diretórios com `index.astro` (ex.: `src/pages/dados/index.astro`, `src/pages/pilar-1/index.astro`), garantindo URLs limpas com barra final (`/sobre-conif/`) tanto no modo de desenvolvimento quanto no build estático com `base` prefixado.
- Evita colisão conceitual com as rotas numéricas dos pilares (`/pilar-1/`, `/pilar-2/`, `/pilar-3/`), deixando explícito que se trata de uma página institucional metodológica sobre o modelo CONIF.

### Alternativas Consideradas

- `/pilares/`: Rejeitada porque poderia sugerir uma lista de indicadores em vez de uma explicação metodológica conceitual.
- `/metodologia/`: Rejeitada por soar excessivamente acadêmica e distante do termo adotado institucionalmente ("modelo CONIF").

---

## 2. Padrão de Integração de Navegação (`BaseLayout.astro`)

### Decisão

1. Integrar a detecção de rota ativa usando `rotaDentroDe(pathname, rawBaseUrl, 'sobre-conif')` em `src/layouts/BaseLayout.astro`.
2. Adicionar o link `"Sobre o Modelo"` na barra de navegação principal (`.nav-pilares`), com suporte total à classe `ativa` e ao atributo `aria-current="page"`.
3. Adicionar o link correspondente dentro da gaveta móvel (`#mobile-drawer`), garantindo acessibilidade em telas pequenas.
4. Preservação de contexto de campus e ano: ao clicar para visualizar qualquer indicador a partir da página `/sobre-conif/`, os parâmetros `?campus=serra&ano=...` devem ser preservados pelos componentes ou formatados com o contexto ativo.

### Justificativa

- Mantém coerência estrita com as regras H-1..H-7 de acessibilidade e consistência de breakpoints já estabelecidas no repositório.

---

## 3. Arquitetura da Página e Componentes

### Decisão

Implementar a página em `src/pages/sobre-conif/index.astro` utilizando componentes semânticos existentes e blocos modulares:

1. **Trilha de navegação (`Breadcrumbs`)**: `<nav class="trilha">` com Início / Sobre o Modelo.
2. **Apresentação / Hero**: Título principal, subtítulo e distintivo de governança.
3. **Seção "O que é o CONIF e o Modelo de P&I"**: Texto didático e resumo da padronização dos Institutos Federais.
4. **Grade dos 3 Pilares com Atalhos**:
   - Card Pilar 1: Missão, público e links para NTPP, QSPP, PIES, PICOT.
   - Card Pilar 2: Missão, captação, Polo Embrapii Serra e links para PINV, PIPDI.
   - Card Pilar 3: Missão, proteção intelectual e links para PIPRO, PIPROT, PIPROTR.
5. **Seção "Importância Estratégica para o Campus Serra"**:
   - 3 eixos explicativos: Transparência Pública, Gestão & Editais, e Atração de Parceiros.
6. **Card de Destaque na Home (`src/pages/index.astro`)**:
   - Um bloco institucional sutil logo acima ou ao lado dos destaques convidando o usuário a compreender a metodologia CONIF.

### Justificativa

- Constrói uma experiência limpa, leve, sem JavaScript client-side desnecessário (zero hidratação pesada), respeitando a velocidade e simplicidade estipuladas no Princípio I da Constituição.

---

## 4. Conformidade Constitucional e de Acessibilidade

### Decisão

- Utilizar exclusivamente tokens definidos em `src/styles/tokens.css` (`--color-primary`, `--color-surface`, `--color-ink`, `--color-border`, etc.).
- Garantir contraste mínimo de 4.5:1 (WCAG AA) em ambos os temas (`claro` e `escuro`).
- Manter foco visível (`:focus-visible`) em todos os links e botões interativos.
- Não incluir dados individualizados (LGPD / Princípio IV).
- Testes automatizados com Vitest cobrindo a existência da rota, marcação do cabeçalho e integridade dos links dos 3 pilares.
