import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import SeletorTema from '../../src/components/SeletorTema.astro';
import {
  CHAVE_STORAGE_TEMA,
  proximoTema,
  resolverTemaEfetivo,
  obterTemaSalvo,
  salvarTema,
  aplicarTema,
} from '../../src/lib/tema';
import { criarElementoMock } from './fixtures/detalhe-fixtures';

describe('Gestão de Tema Claro / Escuro (User Story 4)', () => {
  it('alterna os temas entre claro e escuro', () => {
    expect(proximoTema('claro')).toBe('escuro');
    expect(proximoTema('escuro')).toBe('claro');
  });

  it('resolve o tema efetivo respeitando a preferência manual ou do sistema', () => {
    expect(resolverTemaEfetivo('claro', true)).toBe('claro');
    expect(resolverTemaEfetivo('claro', false)).toBe('claro');
    expect(resolverTemaEfetivo('escuro', false)).toBe('escuro');
    expect(resolverTemaEfetivo('escuro', true)).toBe('escuro');
    expect(resolverTemaEfetivo('auto', true)).toBe('escuro');
    expect(resolverTemaEfetivo('auto', false)).toBe('claro');
  });

  it('lê e salva a preferência no storage sem lançar erro em falhas', () => {
    const memoria: Record<string, string> = {};
    const storageMock = {
      getItem: (k: string) => memoria[k] ?? null,
      setItem: (k: string, v: string) => {
        memoria[k] = v;
      },
    } as Storage;

    expect(obterTemaSalvo(storageMock)).toBe('claro');

    salvarTema('escuro', storageMock);
    expect(memoria[CHAVE_STORAGE_TEMA]).toBe('escuro');
    expect(obterTemaSalvo(storageMock)).toBe('escuro');

    // Storage com erro (ex: navegação privada bloqueada) não estoura exceção
    const storageFalho = {
      getItem: () => {
        throw new Error('QuotaExceeded');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    } as unknown as Storage;

    expect(() => obterTemaSalvo(storageFalho)).not.toThrow();
    expect(obterTemaSalvo(storageFalho)).toBe('claro');
    expect(() => salvarTema('claro', storageFalho)).not.toThrow();
  });

  it('aplicarTema atualiza data-theme no elemento raiz e atualiza os botões data-btn-tema', () => {
    const elHtml = criarElementoMock('html');
    const elBtnClaro = criarElementoMock('button', { 'data-btn-tema': 'claro' });
    const elBtnEscuro = criarElementoMock('button', { 'data-btn-tema': 'escuro' });

    const docMock = {
      documentElement: elHtml,
      querySelectorAll: (sel: string) =>
        sel === '[data-btn-tema]' ? [elBtnClaro, elBtnEscuro] : [],
    } as unknown as Document;

    aplicarTema(docMock, 'escuro');

    expect(elHtml.getAttribute('data-theme')).toBe('escuro');
    expect(elBtnClaro.getAttribute('aria-pressed')).toBe('false');
    expect(elBtnEscuro.getAttribute('aria-pressed')).toBe('true');

    aplicarTema(docMock, 'claro');

    expect(elHtml.getAttribute('data-theme')).toBe('claro');
    expect(elBtnClaro.getAttribute('aria-pressed')).toBe('true');
    expect(elBtnEscuro.getAttribute('aria-pressed')).toBe('false');
  });

  it('SeletorTema renderiza 2 botões distintos para tema claro (sol) e tema escuro (lua)', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SeletorTema);

    expect(html).toContain('data-btn-tema="claro"');
    expect(html).toContain('data-btn-tema="escuro"');
    expect(html).toContain('<svg');
    expect(html).toMatch(/aria-label="Ativar tema claro"/);
    expect(html).toMatch(/aria-label="Ativar tema escuro"/);
    expect(html).not.toContain('icone-auto');
  });

  it('BaseLayout inclui script anti-FOUC no head e renderiza o SeletorTema no cabeçalho', () => {
    const conteudo = readFileSync('src/layouts/BaseLayout.astro', 'utf-8');
    expect(conteudo).toContain('indicadores_tema');
    expect(conteudo).toContain('SeletorTema');
    expect(conteudo).toMatch(/<SeletorTema\b/);
  });
});
