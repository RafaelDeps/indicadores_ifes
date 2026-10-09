import { describe, expect, it } from 'vitest';
import { construirLinha, mapearPontos, calcularEscala, mapearBarras } from '../../src/lib/chart';

const LARGURA = 560;
const ALTURA = 240;

describe('mapearPontos', () => {
  it('mapeia os valores disponíveis em ordem crescente de ano com rótulos numéricos', () => {
    const pontos = mapearPontos(
      [
        { ano: 2022, valor: 10 },
        { ano: 2023, valor: 20 },
        { ano: 2024, valor: 30 },
      ],
      LARGURA,
      ALTURA,
    );
    expect(pontos.map((p) => p.ano)).toEqual([2022, 2023, 2024]);
    expect(pontos[0].x).toBeLessThan(pontos[1].x);
    expect(pontos[1].x).toBeLessThan(pontos[2].x);
    expect(pontos[0].y).toBeGreaterThan(pontos[2].y);
    expect(pontos[0].rotuloY).toBeLessThan(pontos[0].y);
    expect(pontos[0].textoRotulo).toBe('10');
  });

  it('nunca mapeia anos sem dado — não os transforma em zero', () => {
    const pontos = mapearPontos(
      [
        { ano: 2022, valor: 10 },
        { ano: 2023, valor: null, motivoIndisponivel: 'Não informado' },
        { ano: 2024, valor: 30 },
      ],
      LARGURA,
      ALTURA,
    );
    expect(pontos.map((p) => p.ano)).toEqual([2022, 2024]);
  });

  it('centraliza uma série de ano único com rótulo acima do ponto', () => {
    const pontos = mapearPontos([{ ano: 2023, valor: 15 }], LARGURA, ALTURA);
    expect(pontos).toHaveLength(1);
    expect(pontos[0].x).toBe(LARGURA / 2);
    expect(pontos[0].textoRotulo).toBe('15');
    expect(pontos[0].rotuloY).toBeLessThan(pontos[0].y);
  });

  it('posiciona no meio da altura quando todos os valores são iguais', () => {
    const pontos = mapearPontos(
      [
        { ano: 2022, valor: 12 },
        { ano: 2023, valor: 12 },
      ],
      LARGURA,
      ALTURA,
    );
    for (const ponto of pontos) {
      expect(ponto.y).toBe(ALTURA / 2);
      expect(ponto.textoRotulo).toBe('12');
    }
  });

  it('retorna lista vazia quando nenhum ano tem dado', () => {
    const pontos = mapearPontos(
      [{ ano: 2023, valor: null, motivoIndisponivel: 'Não informado' }],
      LARGURA,
      ALTURA,
    );
    expect(pontos).toEqual([]);
  });
});

describe('construirLinha', () => {
  it('produz um path M/L com dois ou mais pontos', () => {
    const linha = construirLinha([
      { ano: 2022, valor: 10, x: 10, y: 20, rotuloX: 10, rotuloY: 10, textoRotulo: '10' },
      { ano: 2023, valor: 20, x: 30, y: 40, rotuloX: 30, rotuloY: 30, textoRotulo: '20' },
    ]);
    expect(linha).toBe('M 10.00 20.00 L 30.00 40.00');
  });

  it('produz string vazia com menos de dois pontos', () => {
    expect(construirLinha([])).toBe('');
    expect(
      construirLinha([
        { ano: 2022, valor: 10, x: 10, y: 20, rotuloX: 10, rotuloY: 10, textoRotulo: '10' },
      ]),
    ).toBe('');
  });
});

describe('calcularEscala', () => {
  it('calcula linhas de referência para o eixo vertical', () => {
    const escala = calcularEscala(
      [
        { ano: 2024, valor: 100 },
        { ano: 2025, valor: 300 },
      ],
      ALTURA,
    );
    expect(escala).not.toBeNull();
    expect(escala?.minimo).toBe(100);
    expect(escala?.maximo).toBe(300);
    expect(escala?.linhas.length).toBeGreaterThanOrEqual(2);
  });

  it('retorna null se não houver valores disponíveis', () => {
    const escala = calcularEscala([{ ano: 2024, valor: null }], ALTURA);
    expect(escala).toBeNull();
  });
});

describe('mapearBarras', () => {
  it('calcula posições e dimensões geométricas proporcionais para anos com dados', () => {
    const barras = mapearBarras(
      [
        { ano: 2022, valor: 10 },
        { ano: 2023, valor: 25 },
        { ano: 2024, valor: 50 },
      ],
      LARGURA,
      ALTURA,
    );

    expect(barras).toHaveLength(3);
    expect(barras.map((b) => b.ano)).toEqual([2022, 2023, 2024]);

    // O ano 2024 (50) deve ter altura maior que 2022 (10)
    expect(barras[2].altura).toBeGreaterThan(barras[0].altura);
    // As barras devem avançar da esquerda para a direita
    expect(barras[0].x).toBeLessThan(barras[1].x);
    expect(barras[1].x).toBeLessThan(barras[2].x);

    // Centro do rótulo e raio dos cantos
    expect(barras[0].centroX).toBe(barras[0].x + barras[0].largura / 2);
    expect(barras[0].rx).toBeGreaterThan(0);
    expect(barras[0].disponivel).toBe(true);
    expect(barras[0].textoRotulo).toBe('10');
    expect(barras[2].textoRotulo).toBe('50');
  });

  it('trata anos com dado indisponível com disponivel=false e texto Indisp.', () => {
    const barras = mapearBarras(
      [
        { ano: 2022, valor: 20 },
        { ano: 2023, valor: null },
        { ano: 2024, valor: 40 },
      ],
      LARGURA,
      ALTURA,
    );

    expect(barras).toHaveLength(3);
    expect(barras[1].ano).toBe(2023);
    expect(barras[1].disponivel).toBe(false);
    expect(barras[1].valor).toBeNull();
    expect(barras[1].textoRotulo).toBe('Indisp.');
    expect(barras[1].altura).toBeLessThanOrEqual(6);
  });

  it('retorna array vazio quando a lista de valores está vazia', () => {
    const barras = mapearBarras([], LARGURA, ALTURA);
    expect(barras).toEqual([]);
  });

  it('posiciona adequadamente quando todos os valores são iguais', () => {
    const barras = mapearBarras(
      [
        { ano: 2023, valor: 30 },
        { ano: 2024, valor: 30 },
      ],
      LARGURA,
      ALTURA,
    );

    expect(barras).toHaveLength(2);
    expect(barras[0].altura).toBe(barras[1].altura);
    expect(barras[0].altura).toBeGreaterThan(0);
    expect(barras[0].textoRotulo).toBe('30');
  });
});
