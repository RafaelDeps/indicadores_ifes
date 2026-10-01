import { describe, expect, it } from 'vitest';
import { construirUrlComParametros } from '../../src/lib/contexto-cliente';

describe('historico (construção de URLs e integração com History API)', () => {
  it('constrói URL mantendo o pathname e atualizando campus e ano', () => {
    const urlAtual = 'https://rafaeldeps.github.io/indicadores_ifes/pilar-1/?campus=serra&ano=2024';
    const novaUrl = construirUrlComParametros(urlAtual, 'serra', 2025);
    expect(novaUrl).toBe('/indicadores_ifes/pilar-1/?campus=serra&ano=2025');
  });

  it('remove campus da URL se campus for "todos"', () => {
    const urlAtual = 'https://rafaeldeps.github.io/indicadores_ifes/?campus=serra&ano=2024';
    const novaUrl = construirUrlComParametros(urlAtual, 'todos', 2026);
    expect(novaUrl).toBe('/indicadores_ifes/?ano=2026');
  });

  it('mantém hashes e parâmetros adicionais se existirem', () => {
    const urlAtual = 'https://rafaeldeps.github.io/indicadores_ifes/pilar-2/#secao-detalhe';
    const novaUrl = construirUrlComParametros(urlAtual, 'serra', 2024);
    expect(novaUrl).toContain('#secao-detalhe');
    expect(novaUrl).toContain('campus=serra');
    expect(novaUrl).toContain('ano=2024');
  });
});
