import { describe, expect, it } from 'vitest';
import { decomporFormula } from '../../src/lib/formula';

describe('decomporFormula', () => {
  describe('Fórmulas com fração e percentual', () => {
    it('decompõe PIES corretamente com numerador, denominador e multiplicador', () => {
      const res = decomporFormula('PIES = (NEP / NTE) × 100', 'PIES');
      expect(res.tipo).toBe('fracao');
      expect(res.siglaResultado).toBe('PIES');
      expect(res.fracao).toBeDefined();
      expect(res.fracao?.numerador).toBe('NEP');
      expect(res.fracao?.denominador).toBe('NTE');
      expect(res.fracao?.multiplicador).toBe('100');
      expect(res.textoAcessivel).toBe(
        'Fórmula de cálculo: PIES é igual a NEP dividido por NTE, multiplicado por 100',
      );
    });

    it('decompõe PICOT com numerador composto e multiplicador', () => {
      const res = decomporFormula('PICOT = (NTECPP / NEP) × 100', 'PICOT');
      expect(res.tipo).toBe('fracao');
      expect(res.fracao?.numerador).toBe('NTECPP');
      expect(res.fracao?.denominador).toBe('NEP');
      expect(res.fracao?.multiplicador).toBe('100');
      expect(res.textoAcessivel).toBe(
        'Fórmula de cálculo: PICOT é igual a NTECPP dividido por NEP, multiplicado por 100',
      );
    });

    it('decompõe PINV com valores monetários em razão', () => {
      const res = decomporFormula('PINV = (TAFPPI / OCC) × 100', 'PINV');
      expect(res.tipo).toBe('fracao');
      expect(res.fracao?.numerador).toBe('TAFPPI');
      expect(res.fracao?.denominador).toBe('OCC');
      expect(res.fracao?.multiplicador).toBe('100');
    });
  });

  describe('Fórmulas aditivas (somas)', () => {
    it('decompõe PIPRO em termos aditivos', () => {
      const res = decomporFormula('PIPRO = NPB + NPT', 'PIPRO');
      expect(res.tipo).toBe('soma');
      expect(res.siglaResultado).toBe('PIPRO');
      expect(res.termosSoma).toEqual(['NPB', 'NPT']);
      expect(res.textoAcessivel).toBe('Fórmula de cálculo: PIPRO é igual a NPB mais NPT');
    });

    it('decompõe PIPROT com 7 termos somados', () => {
      const res = decomporFormula('PIPROT = PA + RM + DI + C + TC + PC + OGM', 'PIPROT');
      expect(res.tipo).toBe('soma');
      expect(res.termosSoma).toEqual(['PA', 'RM', 'DI', 'C', 'TC', 'PC', 'OGM']);
      expect(res.textoAcessivel).toContain('PA mais RM mais DI mais C mais TC mais PC mais OGM');
    });

    it('decompõe PIPROTR com 3 termos somados', () => {
      const res = decomporFormula('PIPROTR = CT + CL + CC', 'PIPROTR');
      expect(res.tipo).toBe('soma');
      expect(res.termosSoma).toEqual(['CT', 'CL', 'CC']);
    });
  });

  describe('Fórmulas diretas e descritivas', () => {
    it('decompõe NTPP como atribuição descritiva', () => {
      const res = decomporFormula('NTPP = Projetos registrados em execução', 'NTPP');
      expect(res.tipo).toBe('direta');
      expect(res.siglaResultado).toBe('NTPP');
      expect(res.expressaoDireta).toBe('Projetos registrados em execução');
      expect(res.textoAcessivel).toBe(
        'Fórmula de cálculo: NTPP é igual a Projetos registrados em execução',
      );
    });

    it('decompõe QSPP como símbolo direto SUPP', () => {
      const res = decomporFormula('QSPP = SUPP', 'QSPP');
      expect(res.tipo).toBe('direta');
      expect(res.expressaoDireta).toBe('SUPP');
    });

    it('decompõe PIPDI como símbolo direto NAPPCT', () => {
      const res = decomporFormula('PIPDI = NAPPCT', 'PIPDI');
      expect(res.tipo).toBe('direta');
      expect(res.expressaoDireta).toBe('NAPPCT');
    });
  });
});
