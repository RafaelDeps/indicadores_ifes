import { describe, expect, it } from 'vitest';
import { datasetMock } from './fixtures/dataset-sample';
import { resolverContextoComAjuste } from '../../src/lib/contexto';

describe('contexto (resolução e auto-ajuste de filtros)', () => {
  it('adota padrão (todos e ano mais recente) quando parâmetros são nulos', () => {
    const res = resolverContextoComAjuste(null, null, datasetMock);
    expect(res.campus).toBe('todos');
    expect(res.ano).toBe(2026);
    expect(res.ajustado).toBe(false);
  });

  it('respeita campus e ano válidos existentes no dataset', () => {
    const res = resolverContextoComAjuste('serra', '2024', datasetMock);
    expect(res.campus).toBe('serra');
    expect(res.ano).toBe(2024);
    expect(res.ajustado).toBe(false);
  });

  it('recai para campus "todos" quando campus informado é desconhecido', () => {
    const res = resolverContextoComAjuste('campus-fantasma', '2025', datasetMock);
    expect(res.campus).toBe('todos');
    expect(res.ano).toBe(2025);
    expect(res.ajustado).toBe(false);
  });

  it('adota ano mais recente quando ano informado é inválido ou NaN', () => {
    const res = resolverContextoComAjuste('serra', 'ano-invalido', datasetMock);
    expect(res.campus).toBe('serra');
    expect(res.ano).toBe(2026);
    expect(res.ajustado).toBe(false);
  });

  it('[FR-013] auto-ajusta para ano disponível mais próximo quando ano não existe no campus selecionado', () => {
    // Vitória só possui anos 2025 e 2026. Usuário pede 2024.
    const res = resolverContextoComAjuste('vitoria', '2024', datasetMock);
    expect(res.campus).toBe('vitoria');
    // Deve ajustar para 2025 (o ano mais próximo/recente disponível em Vitória)
    expect(res.ano).toBe(2025);
    expect(res.ajustado).toBe(true);
  });

  it('[FR-013] auto-ajusta para ano mais recente quando ano solicitado é muito antigo (ex: 1999)', () => {
    const res = resolverContextoComAjuste('serra', '1999', datasetMock);
    expect(res.campus).toBe('serra');
    expect(res.ano).toBe(2026);
    expect(res.ajustado).toBe(true);
  });
});
