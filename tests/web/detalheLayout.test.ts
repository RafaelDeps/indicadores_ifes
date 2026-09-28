import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PAGINAS_DETALHE = [
  'src/pages/pilar-1/[sigla].astro',
  'src/pages/pilar-2/[sigla].astro',
  'src/pages/pilar-3/[sigla].astro',
];

describe('Layout da Página de Detalhe em 2 Colunas e Banner de Destaque (US4)', () => {
  it('todas as páginas de detalhe possuem o banner superior com caixa de destaque', () => {
    for (const caminho of PAGINAS_DETALHE) {
      const conteudo = readFileSync(caminho, 'utf-8');
      expect(conteudo, `banner ausente em ${caminho}`).toContain('detalhe-banner');
      expect(conteudo, `caixa de destaque ausente em ${caminho}`).toContain(
        'banner-destaque-caixa',
      );
      expect(conteudo, `rótulo de destaque ausente em ${caminho}`).toContain('destaque-rotulo');
      expect(conteudo, `valor de destaque ausente em ${caminho}`).toContain('destaque-valor');
    }
  });

  it('todas as páginas de detalhe adotam estrutura de 2 colunas: coluna-principal e coluna-lateral', () => {
    for (const caminho of PAGINAS_DETALHE) {
      const conteudo = readFileSync(caminho, 'utf-8');
      expect(conteudo, `grade 2col ausente em ${caminho}`).toContain('detalhe-grade-2col');
      expect(conteudo, `coluna-principal ausente em ${caminho}`).toContain('coluna-principal');
      expect(conteudo, `coluna-lateral ausente em ${caminho}`).toContain('coluna-lateral');
    }
  });

  it('a coluna principal inclui O que mede, Finalidade, Fórmula mono e Tabela de variáveis com 3 colunas', () => {
    for (const caminho of PAGINAS_DETALHE) {
      const conteudo = readFileSync(caminho, 'utf-8');
      expect(conteudo, `O que mede ausente em ${caminho}`).toContain('O que mede');
      expect(conteudo, `Finalidade ausente em ${caminho}`).toContain('Finalidade');
      expect(conteudo, `Fórmula ausente em ${caminho}`).toContain('formula-mono');
      expect(conteudo, `Tabela de variáveis ausente em ${caminho}`).toContain('tabela-variaveis');
      expect(conteudo, `Coluna Símbolo ausente em ${caminho}`).toContain('Símbolo');
      expect(conteudo, `Coluna Descrição ausente em ${caminho}`).toContain('Descrição');
      expect(conteudo, `Coluna Unidade ausente em ${caminho}`).toContain('Unidade');
    }
  });

  it('a coluna lateral inclui gráfico de evolução recente e cartão de ficha metodológica escuro', () => {
    for (const caminho of PAGINAS_DETALHE) {
      const conteudo = readFileSync(caminho, 'utf-8');
      expect(conteudo, `SeriesChart ausente em ${caminho}`).toContain('SeriesChart');
      expect(conteudo, `card de metodologia escuro ausente em ${caminho}`).toContain(
        'card-metodologia-escuro',
      );
      expect(conteudo, `estilo verde escuro ausente em ${caminho}`).toContain(
        'var(--color-primary-dark)',
      );
    }
  });

  it('não possui campo descontinuado "Fonte dos dados" em nenhuma página de detalhe', () => {
    for (const caminho of PAGINAS_DETALHE) {
      const conteudo = readFileSync(caminho, 'utf-8');
      expect(conteudo, `Fonte dos dados encontrada em ${caminho}`).not.toContain('Fonte dos dados');
    }
  });
});
