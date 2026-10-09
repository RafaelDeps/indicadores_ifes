# Quickstart & Validation Guide: Renderização Tipográfica de Fórmulas

**Feature**: `specs/020-formula-typography`  
**Data**: 2026-10-09  
**Status**: Concluído

---

## 1. Comandos de Validação e Testes Automatizados

### 1.1 Executar Testes Unitários e de Componente

```bash
npm run test:web
```

**Resultado Esperado**:

- Todos os testes passam sem erros.
- A suíte de testes de fórmulas valida a decomposição das 9 fórmulas canônicas, a presença de frações onde aplicável e a marcação de acessibilidade `sr-only`.

### 1.2 Verificar Build Estático

```bash
npm run build
```

---

## 2. Roteiro de Inspeção Visual no Navegador

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

### 2.1 Teste de Indicador com Fração e Multiplicação (ex.: PIES)

Acesse: `http://localhost:4321/pilar-1/pies/`

1. Verifique se a fórmula exibe `NEP` sobre `NTE`, com linha horizontal e `× 100`.
2. Passe o cursor sobre `NEP` na fórmula:
   - A variável na fórmula deve acender.
   - A linha `NEP` na tabela "Variáveis da fórmula" abaixo deve ser destacada simultaneamente.
3. Use o teclado (tecla `Tab`):
   - O foco deve navegar para `NEP`, acionando o anel de foco e o destaque da tabela.

### 2.2 Teste de Indicador com Soma (ex.: PIPRO)

Acesse: `http://localhost:4321/pilar-3/pipro/`

1. Verifique se a fórmula exibe `NPB + NPT` com espaçamento limpo.
2. Teste a correlação com as linhas da tabela.

### 2.3 Teste de Modo Escuro

1. Alterne o tema para 🌙 Escuro no cabeçalho.
2. Verifique se o traço da fração, as variáveis e os fundos de realce mantêm contraste e legibilidade.
