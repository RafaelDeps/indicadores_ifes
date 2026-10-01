import { describe, it, expect } from 'vitest';
import { datasetMock } from './fixtures/dataset-sample';
import { criarDomDetalheMock } from './fixtures/detalhe-fixtures';
import { computarVisaoDetalhe } from '../../src/lib/visao';
import { aplicarVisaoDetalhe } from '../../src/lib/aplicar-visao';

describe('Integridade histórica de componentes (ComponentCount)', () => {
  it('atualiza cada contagem anual usando chave composta sigla + ano sem sobrescrever outros anos', () => {
    const doc = criarDomDetalheMock();

    // No mock inicial:
    // data-componente-qtd="NEP" data-componente-ano="2024" -> 50
    // data-componente-qtd="NEP" data-componente-ano="2025" -> 65
    // data-componente-qtd="NEP" data-componente-ano="2026" -> 80

    const visao = computarVisaoDetalhe(datasetMock, 'PIES', { campus: 'serra', ano: 2025 });
    expect(visao).toBeDefined();

    aplicarVisaoDetalhe(doc, visao!);

    const el2024 = doc.querySelector('[data-componente-qtd="NEP"][data-componente-ano="2024"]');
    const el2025 = doc.querySelector('[data-componente-qtd="NEP"][data-componente-ano="2025"]');

    // Em 2024 na Serra, NEP é 50
    expect(el2024?.textContent?.trim()).toBe('50');
    // Em 2025 na Serra, NEP é 60 (do datasetMock)
    expect(el2025?.textContent?.trim()).toBe('60');
  });
});
