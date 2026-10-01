import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { datasetMock } from './fixtures/dataset-sample';
import { criarIndiceBusca, pesquisarIndicadores } from '../../src/lib/busca';
import BuscaRapida from '../../src/components/BuscaRapida.astro';

describe('Busca rápida de indicadores (busca.ts)', () => {
  it('cria índice de busca completo a partir do dataset', () => {
    const indice = criarIndiceBusca(datasetMock);
    expect(indice.length).toBeGreaterThan(0);
    const ntpp = indice.find((i) => i.sigla === 'NTPP');
    expect(ntpp).toBeDefined();
    expect(ntpp?.pilarNumero).toBe(1);
    expect(ntpp?.slug).toBe('ntpp');
  });

  it('retorna resultados correspondentes por sigla exata ou parcial', () => {
    const indice = criarIndiceBusca(datasetMock);
    const res = pesquisarIndicadores(indice, 'ntpp');
    expect(res).toHaveLength(1);
    expect(res[0].sigla).toBe('NTPP');
  });

  it('ignora maiúsculas/minúsculas e acentuação', () => {
    const indice = criarIndiceBusca(datasetMock);
    const res = pesquisarIndicadores(indice, 'PESQUISA');
    expect(res.length).toBeGreaterThan(0);
  });

  it('retorna vazio quando termo de busca não tem correspondência', () => {
    const indice = criarIndiceBusca(datasetMock);
    const res = pesquisarIndicadores(indice, 'termo_inexistente_xyz');
    expect(res).toHaveLength(0);
  });

  it('retorna todos ou vazio se termo estiver em branco', () => {
    const indice = criarIndiceBusca(datasetMock);
    expect(pesquisarIndicadores(indice, '')).toHaveLength(0);
    expect(pesquisarIndicadores(indice, '   ')).toHaveLength(0);
  });

  it('BuscaRapida.astro renderiza estrutura de input e lista acessível (combobox/listbox)', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BuscaRapida);

    expect(html).toContain('data-busca-input');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('aria-controls="busca-resultados-lista"');
    expect(html).toContain('data-busca-resultados');
    expect(html).toContain('id="busca-resultados-lista"');
    expect(html).toContain('role="listbox"');
  });

  it('BaseLayout renderiza o componente BuscaRapida no cabeçalho e na gaveta móvel', () => {
    const conteudo = readFileSync('src/layouts/BaseLayout.astro', 'utf-8');
    expect(conteudo).toContain('BuscaRapida');
    expect(conteudo).toContain('cabecalho-busca');
    expect(conteudo).toContain('drawer-busca');
  });
});
