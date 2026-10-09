import { describe, it, expect } from 'vitest';
import {
  obterIndicadoresMatriz,
  filtrarIndicadores,
  ordenarIndicadores,
  normalizarTexto,
} from '../../src/lib/matriz';

describe('Módulo Matriz - Filtragem e Ordenação', () => {
  const itens = obterIndicadoresMatriz();

  it('normalizarTexto remove acentos e converte para minúsculas', () => {
    expect(normalizarTexto('Inovação')).toBe('inovacao');
    expect(normalizarTexto('PRODUÇÃO ACADÊMICA')).toBe('producao academica');
    expect(normalizarTexto('  Extensão  ')).toBe('extensao');
  });

  it('filtra por tag temática corretamente', () => {
    const resultadoInovacao = filtrarIndicadores(itens, 'inovacao', '');
    expect(resultadoInovacao.length).toBeGreaterThan(0);
    for (const item of resultadoInovacao) {
      const tagsNormalizadas = item.tags.map(normalizarTexto);
      expect(tagsNormalizadas).toContain('inovacao');
    }

    const resultadoTodas = filtrarIndicadores(itens, 'todas', '');
    expect(resultadoTodas).toHaveLength(9);
  });

  it('filtra por termo de busca em sigla e nome', () => {
    const buscaSigla = filtrarIndicadores(itens, 'todas', 'NTPP');
    expect(buscaSigla).toHaveLength(1);
    expect(buscaSigla[0].sigla).toBe('NTPP');

    const buscaNome = filtrarIndicadores(itens, 'todas', 'propriedade');
    expect(buscaNome.length).toBeGreaterThanOrEqual(1);
    expect(buscaNome.some((i) => i.sigla === 'PIPROT')).toBe(true);
  });

  it('filtra com acentuação indiferente (accent-insensitive)', () => {
    const buscaComAcento = filtrarIndicadores(itens, 'todas', 'produção');
    const buscaSemAcento = filtrarIndicadores(itens, 'todas', 'producao');
    expect(buscaComAcento).toEqual(buscaSemAcento);
    expect(buscaComAcento.some((i) => i.sigla === 'PIPRO')).toBe(true);
  });

  it('combina tag e termo de busca (interseção cumulativa)', () => {
    const combinada = filtrarIndicadores(itens, 'inovacao', 'transferencia');
    expect(combinada).toHaveLength(1);
    expect(combinada[0].sigla).toBe('PIPROTR');

    const semMatch = filtrarIndicadores(itens, 'docencia', 'patente');
    expect(semMatch).toHaveLength(0);
  });

  it('ordena por pilar (asc e desc)', () => {
    const asc = ordenarIndicadores(itens, 'pilar', 'asc');
    expect(asc[0].pilarNumero).toBe(1);
    expect(asc[asc.length - 1].pilarNumero).toBe(3);

    const desc = ordenarIndicadores(itens, 'pilar', 'desc');
    expect(desc[0].pilarNumero).toBe(3);
    expect(desc[desc.length - 1].pilarNumero).toBe(1);
  });

  it('ordena por sigla (asc e desc)', () => {
    const asc = ordenarIndicadores(itens, 'sigla', 'asc');
    expect(asc[0].sigla).toBe('NTPP');

    const desc = ordenarIndicadores(itens, 'sigla', 'desc');
    expect(desc[0].sigla).toBe('QSPP');
  });

  it('ordena por nome (asc e desc)', () => {
    const asc = ordenarIndicadores(itens, 'nome', 'asc');
    const desc = ordenarIndicadores(itens, 'nome', 'desc');
    expect(asc[0].nome.localeCompare(asc[asc.length - 1].nome, 'pt-BR')).toBeLessThan(0);
    expect(desc[0].nome.localeCompare(desc[desc.length - 1].nome, 'pt-BR')).toBeGreaterThan(0);
  });
});
