/**
 * Normalização da rota corrente (feature 016, T020 — correção que H-5 exige).
 *
 * Os casos abaixo são os que quebram no build real. O caso que motivou o módulo
 * está no fim: com `base: '/indicadores_ifes'`, o build estático entrega
 * `pathname` com o `base` embutido, e todo `startsWith('/pilar-1')` no layout
 * devolvia falso — nenhuma página marcava a própria aba.
 */

import { describe, expect, it } from 'vitest';

import { rotaDentroDe, rotaRelativa } from '../../src/lib/rota';

const BASE = '/indicadores_ifes/';

describe('rotaRelativa', () => {
  it('corta o base com barra final', () => {
    expect(rotaRelativa('/indicadores_ifes/dados/', BASE)).toBe('/dados');
    expect(rotaRelativa('/indicadores_ifes/pilar-1/pies/', BASE)).toBe('/pilar-1/pies');
  });

  it('corta o base sem barra final', () => {
    expect(rotaRelativa('/indicadores_ifes/dados/', '/indicadores_ifes')).toBe('/dados');
  });

  it('a home volta a ser a raiz, e não o base', () => {
    // Esta é a linha que repara a aba "Visão geral": o build entrega
    // `/indicadores_ifes` — sem barra — e `=== '/'` nunca casava.
    expect(rotaRelativa('/indicadores_ifes', BASE)).toBe('/');
    expect(rotaRelativa('/indicadores_ifes/', BASE)).toBe('/');
  });

  it('trata a raiz do site como base vazio', () => {
    expect(rotaRelativa('/dados/', '/')).toBe('/dados');
    expect(rotaRelativa('/', '/')).toBe('/');
  });

  it('normaliza a barra final da rota', () => {
    expect(rotaRelativa('/indicadores_ifes/dados', BASE)).toBe('/dados');
    expect(rotaRelativa('/dados///', '/')).toBe('/dados');
  });

  it('não corta um prefixo que é só semelhança de string', () => {
    // `startsWith` cru aqui removeria `/indicadores_ifes_extra` do início de
    // `/indicadores_ifes_extra/pilar-1/` e a comparação seguinte falharia.
    expect(rotaRelativa('/indicadores_ifes_extra/pilar-1/', BASE)).toBe(
      '/indicadores_ifes_extra/pilar-1',
    );
  });

  it('preserva a barra inicial quando a rota é vazia', () => {
    expect(rotaRelativa('', BASE)).toBe('/');
  });

  it('aceita pathname vazio sem devolver string vazia', () => {
    // Retornar `''` quebraria `rota === '/'` silenciosamente.
    expect(rotaRelativa('', '/')).toBe('/');
    expect(rotaRelativa('', '')).toBe('/');
  });
});

describe('rotaDentroDe', () => {
  it('reconhece a própria página', () => {
    expect(rotaDentroDe('/indicadores_ifes/dados/', BASE, 'dados')).toBe(true);
  });

  it('reconhece as páginas filhas', () => {
    expect(rotaDentroDe('/indicadores_ifes/pilar-1/pies/', BASE, 'pilar-1')).toBe(true);
  });

  it('reconhece a mesma rota sem barra final', () => {
    expect(rotaDentroDe('/indicadores_ifes/dados', BASE, 'dados')).toBe(true);
  });

  it('reconhece a raiz quando o segmento é vazio', () => {
    expect(rotaDentroDe('/indicadores_ifes', BASE, '')).toBe(true);
    expect(rotaDentroDe('/indicadores_ifes/pilar-1/', BASE, '')).toBe(false);
  });

  it('não casa com a home por causa da barra inicial', () => {
    expect(rotaDentroDe('/indicadores_ifes', BASE, 'dados')).toBe(false);
  });

  it('não casa com um segmento que é prefixo de outro', () => {
    // `startsWith('/pilar-1')` cru casaria `/pilar-10` e marcaria a aba errada.
    expect(rotaDentroDe('/pilar-10/', '/', 'pilar-1')).toBe(false);
    expect(rotaDentroDe('/pilar-1x/', '/', 'pilar-1')).toBe(false);
    expect(rotaDentroDe('/dados-internos/', '/', 'dados')).toBe(false);
  });

  it('funciona sem base configurado', () => {
    expect(rotaDentroDe('/dados/', '/', 'dados')).toBe(true);
    expect(rotaDentroDe('/', '/', '')).toBe(true);
  });
});
