import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computarVisaoMemoria } from '../../src/lib/memoria';
import { obterIndicadorCompleto } from '../../src/lib/dataset-core';
import { carregarDataset } from '../../src/lib/dataset';
import { formatValor } from '../../src/lib/formatters';
import { datasetMemoria } from './fixtures/dataset-memoria';

const SIGLAS = [
  'NTPP',
  'QSPP',
  'PIES',
  'PICOT',
  'PINV',
  'PIPDI',
  'PIPRO',
  'PIPROT',
  'PIPROTR',
] as const;

describe('computarVisaoMemoria — memória de cálculo (spec 025, US1)', () => {
  it('retorna undefined para sigla inexistente no dicionário', () => {
    expect(
      computarVisaoMemoria(datasetMemoria, 'FOO', { campus: 'serra', ano: 2024 }),
    ).toBeUndefined();
  });

  it('PIES 2025/Serra: lista NEP e NTE com nome, valor bruto e unidade (FR-002)', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIES', { campus: 'serra', ano: 2025 });
    expect(memoria).toBeDefined();
    const nep = memoria!.variaveis.find((v) => v.simbolo === 'NEP');
    const nte = memoria!.variaveis.find((v) => v.simbolo === 'NTE');
    expect(nep).toBeDefined();
    expect(nte).toBeDefined();
    expect(nep!.valorFormatado).toBe('60');
    expect(nep!.disponivel).toBe(true);
    expect(nep!.unidade).toBe('Estudantes');
    expect(nep!.nome).toBe('Número de estudantes envolvidos em projetos de pesquisa');
    expect(nte!.valorFormatado).toBe('1.000');
  });

  it('PIES 2025/Serra: preserva a fórmula declarada e substitui os símbolos pelos valores (FR-003)', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIES', { campus: 'serra', ano: 2025 })!;
    expect(memoria.formulaDeclarada).toBe('PIES = (NEP / NTE) × 100');
    expect(memoria.formulaSubstituida).toBe('(60 / 1.000) × 100');
    expect(memoria.nota).toBeUndefined();
  });

  it('PIES 2025/Serra: valor final é exatamente o canônico percentual (FR-004, Princípio III)', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIES', { campus: 'serra', ano: 2025 })!;
    expect(memoria.valorFinalFormatado).toBe('6%');
    expect(memoria.disponivel).toBe(true);
    expect(memoria.unidadeJaNoValor).toBe(true);
  });

  it('NTPP (transcrição direta): mostra o componente de entrada e o valor final, sem variáveis inventadas (edge case)', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'NTPP', { campus: 'serra', ano: 2024 })!;
    expect(memoria.variaveis.map((v) => v.simbolo)).toEqual(['PRE']);
    expect(memoria.variaveis[0].valorFormatado).toBe('10');
    expect(memoria.variaveis[0].unidade).toBe('Projetos');
    expect(memoria.formulaSubstituida).toBe('Projetos registrados em execução');
    expect(memoria.valorFinalFormatado).toBe('10');
    expect(memoria.unidadeJaNoValor).toBe(false);
  });

  it('QSPP (direta por sigla): fórmula substituída pelo valor do componente', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'QSPP', { campus: 'serra', ano: 2024 })!;
    expect(memoria.variaveis.map((v) => v.simbolo)).toEqual(['SUPP']);
    expect(memoria.formulaSubstituida).toBe('20');
    expect(memoria.valorFinalFormatado).toBe('20');
  });

  it('PIPDI (direta por sigla): fórmula substituída pelo valor do componente', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIPDI', { campus: 'serra', ano: 2024 })!;
    expect(memoria.formulaSubstituida).toBe('4');
    expect(memoria.valorFinalFormatado).toBe('4');
  });

  it('PIPRO (soma): termos substituídos pelos valores dos componentes', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIPRO', { campus: 'serra', ano: 2024 })!;
    expect(memoria.formulaSubstituida).toBe('25 + 15');
    expect(memoria.valorFinalFormatado).toBe('40');
  });

  it('PIPROT (soma parcial): variável sem apuração vira "Dado indisponível" e a nota aparece (Princípio III)', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIPROT', { campus: 'serra', ano: 2024 })!;
    const rm = memoria.variaveis.find((v) => v.simbolo === 'RM');
    expect(rm).toBeDefined();
    expect(rm!.disponivel).toBe(false);
    expect(rm!.valorFormatado).toBe('Dado indisponível');
    expect(memoria.formulaSubstituida).toContain('Dado indisponível');
    expect(memoria.nota).toBeTruthy();
    expect(memoria.valorFinalFormatado).toBe('5');
    expect(memoria.formulaSubstituida).not.toMatch(/Infinity|NaN/);
  });

  it('PIES 2026/Serra: numerador ausente — nota transparente e valor final publicado mantido (edge case)', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIES', { campus: 'serra', ano: 2026 })!;
    const nep = memoria.variaveis.find((v) => v.simbolo === 'NEP');
    expect(nep).toBeDefined();
    expect(nep!.disponivel).toBe(false);
    expect(nep!.valorFormatado).toBe('Dado indisponível');
    expect(memoria.formulaSubstituida).toContain('Dado indisponível');
    expect(memoria.nota).toBeTruthy();
    expect(memoria.valorFinalFormatado).toBe('7%');
    expect(memoria.formulaSubstituida).not.toMatch(/Infinity|NaN/);
  });

  it('campus com um único ano: memória reflete o contexto do campus (Litoral 2025)', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIES', { campus: 'litoral', ano: 2025 })!;
    expect(memoria.formulaSubstituida).toBe('(30 / 750) × 100');
    expect(memoria.valorFinalFormatado).toBe('4%');
    expect(memoria.contexto).toEqual({ campus: 'litoral', ano: 2025 });
  });

  it('contexto consolidado (todos) sem entradas: tudo "Dado indisponível", nunca zero (edge case)', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIES', { campus: 'todos', ano: 2025 })!;
    expect(memoria.disponivel).toBe(false);
    expect(memoria.valorFinalFormatado).toBe('Dado indisponível');
    expect(memoria.variaveis.length).toBeGreaterThan(0);
    for (const variavel of memoria.variaveis) {
      expect(variavel.valorFormatado).toBe('Dado indisponível');
      expect(variavel.disponivel).toBe(false);
    }
  });

  it('fidelidade varre o dataset real (quando presente): valor final === canônico e sem Infinity/NaN (SC-002)', () => {
    if (!existsSync('data/dist/indicadores.zip')) {
      return;
    }
    const dataset = carregarDataset();
    const anoRef = Math.max(...dataset.anos);
    for (const campus of dataset.campi.map((c) => c.slug)) {
      for (const sigla of SIGLAS) {
        const memoria = computarVisaoMemoria(dataset, sigla, { campus, ano: anoRef });
        expect(memoria, `${sigla}/${campus}`).toBeDefined();
        const indicador = obterIndicadorCompleto(dataset, sigla, campus);
        const valor = indicador?.valores.find((v) => v.ano === anoRef)?.valor ?? null;
        const sufixo = indicador?.tipoValor === 'percentual' ? '%' : '';
        const esperado = valor !== null ? formatValor(valor) + sufixo : 'Dado indisponível';
        expect(memoria!.valorFinalFormatado, `${sigla}/${campus}`).toBe(esperado);
        expect(memoria!.formulaSubstituida, `${sigla}/${campus}`).not.toMatch(/Infinity|NaN/);
      }
    }
  });
});

describe('computarVisaoMemoria — histórico multi-anual (spec 025, US2)', () => {
  it('cobre todos os anos disponíveis do campus ativo, com o ano ativo marcado (SC-007, FR-006)', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIES', { campus: 'serra', ano: 2025 })!;
    expect(memoria.historico.anos).toEqual([2024, 2025, 2026]);
    expect(memoria.historico.anoAtivo).toBe(2025);
  });

  it('linhas por variável com valores formatados por ano, inclusive a célula sem apuração', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIES', { campus: 'serra', ano: 2025 })!;
    const nep = memoria.historico.linhas.find((l) => l.simbolo === 'NEP');
    expect(nep).toBeDefined();
    expect(nep!.valoresPorAno[2024]).toBe('50');
    expect(nep!.valoresPorAno[2025]).toBe('60');
    expect(nep!.valoresPorAno[2026]).toBe('Dado indisponível');
  });

  it('campus com um único ano: histórico só tem os anos daquele campus (Litoral)', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIES', { campus: 'litoral', ano: 2025 })!;
    expect(memoria.historico.anos).toEqual([2025]);
    const nep = memoria.historico.linhas.find((l) => l.simbolo === 'NEP');
    expect(nep!.valoresPorAno[2025]).toBe('30');
  });

  it('ano sem entrada do indicador no campus: células "Dado indisponível", nunca ausentes', () => {
    const memoria = computarVisaoMemoria(datasetMemoria, 'PIPRO', { campus: 'serra', ano: 2024 })!;
    expect(memoria.historico.anos).toEqual([2024, 2025, 2026]);
    const npb = memoria.historico.linhas.find((l) => l.simbolo === 'NPB');
    expect(npb!.valoresPorAno[2024]).toBe('25');
    expect(npb!.valoresPorAno[2025]).toBe('Dado indisponível');
    expect(npb!.valoresPorAno[2026]).toBe('Dado indisponível');
  });
});
