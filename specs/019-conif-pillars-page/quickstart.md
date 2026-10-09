# Quickstart & Validation Guide: Nova Página dos Pilares CONIF

**Feature**: `specs/019-conif-pillars-page`  
**Data**: 2026-10-09  
**Status**: Concluído

---

## 1. Pré-requisitos e Ambiente

Certifique-se de estar na raiz do projeto e com a branch correta:

```bash
git status
# Deve indicar branch 'feat/new_pages'
```

Instale as dependências caso ainda não tenha feito:

```bash
npm install
```

---

## 2. Comandos de Validação e Testes Automatizados

### 2.1 Executar Testes Automatizados do Frontend

```bash
npm run test:web
```

**Resultado Esperado**:

- Todos os testes da suíte Vitest em `tests/web/` devem passar sem falhas (100% de sucesso).
- Novos testes dedicados validam a presença do arquivo `src/pages/sobre-conif/index.astro`, o link no cabeçalho e a integridade dos links de indicadores.

### 2.2 Verificar Build Estático da Aplicação

```bash
npm run build
```

**Resultado Esperado**:

- O build do Astro deve ser concluído com sucesso, gerando a rota estática `/sobre-conif/index.html` em `dist/`.

---

## 3. Validação Manual no Navegador

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra o navegador em:
👉 `http://localhost:4321/sobre-conif/`

### Roteiro de Inspeção Visual:

1. **Cabeçalho & Menu:**
   - Verifique se o link "Sobre o Modelo" está visível no topo e marcado com a classe ativa (`ativa`).
   - Diminua a largura da janela para mobile (< 640px), abra a gaveta móvel e verifique se o link também está lá.
2. **Conteúdo Institucional:**
   - Leia a introdução sobre o CONIF.
   - Verifique os blocos dos 3 pilares e teste os links de atalho para os indicadores (ex.: clique em `NTPP`, `PIPDI` e `PIPRO`).
   - Verifique a seção de relevância estratégica do Campus Serra (Polo Embrapii, transparência, etc.).
3. **Página Inicial:**
   - Acesse `http://localhost:4321/`.
   - Confirme a presença do card ou banner convidativo direcionando para `/sobre-conif/`.
4. **Temas Claro e Escuro:**
   - Alterne o seletor de tema no cabeçalho (☀️ Claro / 🌙 Escuro) e certifique-se de que o contraste das cores e fundos permaneça legível e confortável.
