export interface Cor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function canalLinear(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function analisarCor(cor: string): Cor {
  const c = cor.trim().toLowerCase();
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b, a] = hex.split('').map((ch) => parseInt(ch + ch, 16));
      return { r, g, b, a: a ?? 255 };
    }
    if (hex.length === 6 || hex.length === 8) {
      const pares = hex.match(/../g) ?? [];
      const [r, g, b, a] = pares.map((par) => parseInt(par, 16));
      return { r, g, b, a: a ?? 255 };
    }
  }
  if (c.startsWith('rgb')) {
    const numeros = c.match(/[\d.]+/g) ?? [];
    const [r, g, b, a] = numeros.map(Number);
    return { r, g, b, a: a ?? 1 };
  }
  throw new Error(`Cor não reconhecida: ${cor}`);
}

export function luminancia(cor: string): number {
  const { r, g, b } = analisarCor(cor);
  return (
    0.2126 * canalLinear(r / 255) + 0.7152 * canalLinear(g / 255) + 0.0722 * canalLinear(b / 255)
  );
}

function compor(sobre: Cor, fundo: Cor): Cor {
  const a = sobre.a;
  return {
    r: a * sobre.r + (1 - a) * fundo.r,
    g: a * sobre.g + (1 - a) * fundo.g,
    b: a * sobre.b + (1 - a) * fundo.b,
    a: 1,
  };
}

export function taxaContraste(primeira: string, segunda: string): number {
  const c1 = analisarCor(primeira);
  const c2 = analisarCor(segunda);
  const fgEfetiva = c1.a < 1 ? compor(c1, c2) : c1;
  const l1 = luminanciaPara(fgEfetiva);
  const l2 = luminanciaPara(c2);
  const razao = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Math.round(razao * 100) / 100;
}

function luminanciaPara(cor: Cor): number {
  return (
    0.2126 * canalLinear(cor.r / 255) +
    0.7152 * canalLinear(cor.g / 255) +
    0.0722 * canalLinear(cor.b / 255)
  );
}
