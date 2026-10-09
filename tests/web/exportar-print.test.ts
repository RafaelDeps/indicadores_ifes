import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CAMINHO_HISTORICO = 'src/components/HistoricalSeries.astro';
const CAMINHO_GRAFICO = 'src/components/SeriesChart.astro';
const CAMINHO_DETALHE = 'src/components/IndicadorDetalhe.astro';

describe('Ferramentas de Exportação e Impressão (Feature 022)', () => {
  describe('User Story 1: Exportação da Série Histórica em CSV (HistoricalSeries)', () => {
    it('o componente HistoricalSeries possui botão de exportar CSV com atributo acessível', () => {
      expect(existsSync(CAMINHO_HISTORICO)).toBe(true);
      const conteudo = readFileSync(CAMINHO_HISTORICO, 'utf-8');
      expect(conteudo).toContain('data-btn-exportar-csv');
      expect(conteudo).toMatch(/aria-label=["'][^"']*CSV[^"']*["']/i);
    });

    it('o componente HistoricalSeries integra a rotina de download de CSV', () => {
      const conteudo = readFileSync(CAMINHO_HISTORICO, 'utf-8');
      expect(conteudo).toContain('gerarCsvSerieHistorica');
      expect(conteudo).toContain('dispararDownloadArquivo');
    });
  });

  describe('User Story 2: Alternância de Visualização no Gráfico (SeriesChart)', () => {
    it('o componente SeriesChart não possui botão de baixar imagem em cima do gráfico', () => {
      expect(existsSync(CAMINHO_GRAFICO)).toBe(true);
      const conteudo = readFileSync(CAMINHO_GRAFICO, 'utf-8');
      expect(conteudo).not.toContain('data-btn-exportar-png');
    });

    it('o componente SeriesChart preserva os botões de alternância Linha e Barras', () => {
      const conteudo = readFileSync(CAMINHO_GRAFICO, 'utf-8');
      expect(conteudo).toContain('data-btn-modo="linha"');
      expect(conteudo).toContain('data-btn-modo="barras"');
    });
  });

  describe('User Story 3: Ficha de Impressão A4 Otimizada (IndicadorDetalhe)', () => {
    it('o componente IndicadorDetalhe possui botão de ação para imprimir ficha', () => {
      expect(existsSync(CAMINHO_DETALHE)).toBe(true);
      const conteudo = readFileSync(CAMINHO_DETALHE, 'utf-8');
      expect(conteudo).toContain('data-btn-imprimir');
      expect(conteudo).toContain('window.print()');
    });

    it('possui cabeçalho formal institucional exclusivo para impressão', () => {
      const conteudo = readFileSync(CAMINHO_DETALHE, 'utf-8');
      expect(conteudo).toContain('cabecalho-impressao');
      expect(conteudo).toContain('IFES');
      expect(conteudo).toContain('Campus Serra');
    });

    it('possui regras @media print que ocultam elementos da interface de navegação', () => {
      const conteudo = readFileSync(CAMINHO_DETALHE, 'utf-8');
      expect(conteudo).toContain('@media print');
      expect(conteudo).toMatch(/@media print[\s\S]*display:\s*none/);
    });
  });
});
