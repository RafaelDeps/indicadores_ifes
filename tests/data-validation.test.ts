import { describe, expect, it } from 'vitest';
import {
  indicadores,
  validarIndicador,
  SIGLAS_VALIDAS,
  PILARES,
  INDICADORES_META,
} from '../src/data/indicadores';
import type { Indicador } from '../src/data/indicadores';

const SIGLAS_P1 = ['NTPP', 'QSPP', 'PIES', 'PICOT'];
const SIGLAS_TODOS_PILARES = [
  'NTPP',
  'QSPP',
  'PIES',
  'PICOT',
  'PINV',
  'PIPDI',
  'PIPRO',
  'PIPROT',
  'PIPROTR',
];

const indicadorValido: Indicador = {
  sigla: 'NTPP',
  slug: 'ntpp',
  nome: 'Indicador de teste',
  oQueMede: 'Mede algo.',
  formula: 'X / Y * 100',
  variaveis: [{ sigla: 'X', descricao: 'Variável X' }],
  polaridade: 'maior-e-melhor',
  fonteDados: 'Relatório oficial',
  dataAtualizacao: '2026-09-21',
  valores: [{ ano: 2023, valor: 10 }],
  componentes: [],
};

describe('coleção de indicadores', () => {
  it('contém os quatro indicadores do Pilar 1 na ordem canônica', () => {
    expect(indicadores.map((i) => i.sigla)).toEqual(SIGLAS_P1);
  });

  it('possui slugs únicos derivados da sigla', () => {
    const slugs = indicadores.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const indicador of indicadores) {
      expect(indicador.slug).toBe(indicador.sigla.toLowerCase());
    }
  });

  it('possui anos estritamente crescentes e únicos dentro do intervalo válido', () => {
    for (const indicador of indicadores) {
      const series = [
        indicador.valores.map((v) => v.ano),
        ...indicador.componentes.map((c) => c.valores.map((v) => v.ano)),
      ];
      for (const anos of series) {
        for (let k = 1; k < anos.length; k++) {
          expect(anos[k]).toBeGreaterThan(anos[k - 1]);
        }
        for (const ano of anos) {
          expect(ano).toBeGreaterThanOrEqual(2000);
          expect(ano).toBeLessThanOrEqual(2100);
        }
      }
    }
  });

  it('valor nulo sempre possui motivo e valor presente nunca possui motivo', () => {
    for (const indicador of indicadores) {
      for (const valor of indicador.valores) {
        if (valor.valor === null) {
          expect(valor.motivoIndisponivel?.trim()).toBeTruthy();
        } else {
          expect(valor.motivoIndisponivel).toBeUndefined();
        }
      }
      for (const componente of indicador.componentes) {
        for (const valor of componente.valores) {
          if (valor.quantidade === null) {
            expect(valor.motivoIndisponivel?.trim()).toBeTruthy();
          } else {
            expect(valor.motivoIndisponivel).toBeUndefined();
          }
        }
      }
    }
  });

  it('indicador sem valores declara o motivo da indisponibilidade', () => {
    for (const indicador of indicadores) {
      if (indicador.valores.length === 0) {
        expect(indicador.motivoIndisponivel?.trim()).toBeTruthy();
      }
    }
  });

  it('dataAtualizacao é nula ou está em YYYY-MM-DD', () => {
    for (const indicador of indicadores) {
      if (indicador.dataAtualizacao !== null && indicador.dataAtualizacao !== undefined) {
        expect(indicador.dataAtualizacao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

describe('estrutura dos 3 pilares CONIF e 9 indicadores', () => {
  it('contém exatamente 3 pilares definidos', () => {
    expect(PILARES.length).toBe(3);
    expect(PILARES.map((p) => p.numero)).toEqual([1, 2, 3]);
  });

  it('contém exatamente as 9 siglas esperadas em SIGLAS_VALIDAS', () => {
    expect(Array.from(SIGLAS_VALIDAS)).toEqual(SIGLAS_TODOS_PILARES);
  });

  it('possui metadados completos para os 9 indicadores', () => {
    for (const sigla of SIGLAS_TODOS_PILARES) {
      const meta = INDICADORES_META[sigla as keyof typeof INDICADORES_META];
      expect(meta).toBeDefined();
      expect(meta.sigla).toBe(sigla);
      expect(meta.slug).toBe(sigla.toLowerCase());
      expect([1, 2, 3]).toContain(meta.pilarNumero);
      expect(meta.polaridade).toBe('maior-e-melhor');
    }
  });
});

describe('validarIndicador', () => {
  it('aceita um indicador válido do Pilar 1', () => {
    expect(() => validarIndicador(indicadorValido)).not.toThrow();
  });

  it('aceita indicadores válidos dos Pilares 2 e 3', () => {
    expect(() =>
      validarIndicador({
        ...indicadorValido,
        sigla: 'PINV',
        slug: 'pinv',
      }),
    ).not.toThrow();

    expect(() =>
      validarIndicador({
        ...indicadorValido,
        sigla: 'PIPROT',
        slug: 'piprot',
      }),
    ).not.toThrow();
  });

  it('rejeita sigla não pertencente a nenhum dos 3 pilares', () => {
    expect(() => validarIndicador({ ...indicadorValido, sigla: 'XXXX' })).toThrow();
  });

  it('rejeita slug diferente da sigla em minúsculas', () => {
    expect(() => validarIndicador({ ...indicadorValido, slug: 'outra-coisa' })).toThrow();
  });

  it('rejeita polaridade diferente de maior-e-melhor', () => {
    expect(() => validarIndicador({ ...indicadorValido, polaridade: 'menor-e-melhor' })).toThrow();
  });

  it('rejeita valor nulo sem motivo', () => {
    expect(() =>
      validarIndicador({ ...indicadorValido, valores: [{ ano: 2023, valor: null }] }),
    ).toThrow();
  });

  it('rejeita valor presente com motivo', () => {
    expect(() =>
      validarIndicador({
        ...indicadorValido,
        valores: [{ ano: 2023, valor: 10, motivoIndisponivel: 'não deveria' }],
      }),
    ).toThrow();
  });

  it('rejeita anos fora de ordem', () => {
    expect(() =>
      validarIndicador({
        ...indicadorValido,
        valores: [
          { ano: 2023, valor: 10 },
          { ano: 2022, valor: 9 },
        ],
      }),
    ).toThrow();
  });

  it('rejeita indicador sem valores e sem motivo', () => {
    expect(() => validarIndicador({ ...indicadorValido, valores: [] })).toThrow();
  });

  it('rejeita dataAtualizacao em formato inválido', () => {
    expect(() => validarIndicador({ ...indicadorValido, dataAtualizacao: '21/09/2026' })).toThrow();
  });
});
