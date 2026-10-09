# Quickstart: Validação de Exportação (PNG, CSV) e Impressão

Guia rápido de validação das ferramentas de exportação e impressão institucional.

## 1. Execução de Testes Automatizados

### Validação das Funções de Exportação CSV

```bash
npx vitest run tests/web/exportar-csv.test.ts
```

### Validação dos Contratos de Interface e Impressão

```bash
npx vitest run tests/web/exportar-print.test.ts
```

---

## 2. Validação Manual no Navegador

1. Iniciar servidor:
   ```bash
   npm run dev
   ```
2. Acessar `/pilar-1/pies/` ou `/pilar-1/ntpp/`.
3. **Testar Exportação CSV**:
   - Clicar em "Exportar CSV" junto à série histórica.
   - Confirmar o download do arquivo `ifes_serra_<sigla>_serie_historica.csv`.
   - Abrir no Excel ou editor de texto e conferir a presença do BOM UTF-8 e delimitador `;`.
4. **Testar Baixar Gráfico PNG**:
   - Clicar em "Baixar PNG" nos controles do gráfico.
   - Conferir se o arquivo de imagem gerado possui fundo branco, título do indicador e cabeçalho institucional.
5. **Testar Impressão A4**:
   - Clicar em "Imprimir" ou teclar `Ctrl + P`.
   - Verificar na pré-visualização de impressão se menus, botões e elementos desnecessários desapareceram e se a ficha está com layout limpo e formal.
