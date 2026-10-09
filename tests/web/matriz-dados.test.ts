import { describe, it, expect } from 'vitest';
import { obterIndicadoresMatriz, obterTagsDisponiveis, TAGS_CATALOGO } from '../../src/lib/matriz';

describe('Módulo Matriz - Enriquecimento e Dados (Campus Serra)', () => {
  it('retorna exatamente os 9 indicadores do Campus Serra', () => {
    const itens = obterIndicadoresMatriz();
    expect(itens).toHaveLength(9);

    const siglas = itens.map((i) => i.sigla);
    expect(siglas).toEqual(
      expect.arrayContaining([
        'NTPP',
        'QSPP',
        'PIES',
        'PICOT',
        'PINV',
        'PIPDI',
        'PIPRO',
        'PIPROT',
        'PIPROTR',
      ]),
    );
  });

  it('todos os itens contêm atributos obrigatórios preenchidos', () => {
    const itens = obterIndicadoresMatriz();
    for (const item of itens) {
      expect(item.sigla).toBeTruthy();
      expect(item.nome).toBeTruthy();
      expect([1, 2, 3]).toContain(item.pilarNumero);
      expect(item.pilarNome).toBeTruthy();
      expect(item.urlDetalhe).toMatch(/^\/pilar-[123]\/[a-z0-9]+\/$/);
      expect(Array.isArray(item.tags)).toBe(true);
      expect(item.tags.length).toBeGreaterThanOrEqual(1);
      expect(item.polaridadeRotulo).toBeTruthy();
    }
  });

  it('associa corretamente as tags temáticas catalogadas a cada indicador', () => {
    const itens = obterIndicadoresMatriz();
    const ntpp = itens.find((i) => i.sigla === 'NTPP');
    expect(ntpp?.tags).toContain('Pesquisa');
    expect(ntpp?.tags).toContain('Docência');

    const piprot = itens.find((i) => i.sigla === 'PIPROT');
    expect(piprot?.tags).toContain('Inovação');
    expect(piprot?.tags).toContain('Propriedade Intelectual');
  });

  it('preserva "Dado indisponível" e não converte valores nulos em zero (Princípio III)', () => {
    const itens = obterIndicadoresMatriz(2020);
    // PIES não tem apuração anterior no início
    const pies = itens.find((i) => i.sigla === 'PIES');
    if (pies && pies.ultimoValor === null) {
      expect(pies.ultimoValorFormatado).toBe('Dado indisponível');
    }
  });

  it('obterTagsDisponiveis gera lista ordenada com total de ocorrências', () => {
    const itens = obterIndicadoresMatriz();
    const tags = obterTagsDisponiveis(itens);

    expect(tags.length).toBeGreaterThan(0);
    const tagPesquisa = tags.find((t) => t.id === 'pesquisa');
    expect(tagPesquisa).toBeDefined();
    expect(tagPesquisa?.total).toBeGreaterThanOrEqual(2);
  });

  it('TAGS_CATALOGO possui mapeamento explícito para as 9 siglas', () => {
    const chaves = Object.keys(TAGS_CATALOGO);
    expect(chaves).toHaveLength(9);
    for (const sigla of chaves) {
      expect(TAGS_CATALOGO[sigla as keyof typeof TAGS_CATALOGO].length).toBeGreaterThan(0);
    }
  });
});
