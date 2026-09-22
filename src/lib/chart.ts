export interface PontoGrafico {
  ano: number;
  valor: number;
  x: number;
  y: number;
  rotuloX: number;
  rotuloY: number;
  textoRotulo: string;
}

export interface ValorParaGrafico {
  ano: number;
  valor: number | null;
}

export interface LinhaEscala {
  y: number;
  valor: number;
  rotulo: string;
}

export interface EixoEscala {
  minimo: number;
  maximo: number;
  meio: number;
  linhas: LinhaEscala[];
}

const FORMATADOR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function calcularEscala(
  valores: ValorParaGrafico[],
  altura: number,
  margem = 32,
): EixoEscala | null {
  const disponiveis = valores.filter((v) => v.valor !== null).map((v) => v.valor as number);

  if (disponiveis.length === 0) return null;

  const minimo = Math.min(...disponiveis);
  const maximo = Math.max(...disponiveis);
  const meio = (minimo + maximo) / 2;

  const yParaValor = (v: number) =>
    maximo === minimo
      ? altura / 2
      : altura - margem - ((v - minimo) / (maximo - minimo)) * (altura - 2 * margem);

  const linhas: LinhaEscala[] = [
    { y: yParaValor(maximo), valor: maximo, rotulo: FORMATADOR.format(maximo) },
    { y: yParaValor(minimo), valor: minimo, rotulo: FORMATADOR.format(minimo) },
  ];

  if (maximo !== minimo) {
    linhas.splice(1, 0, {
      y: yParaValor(meio),
      valor: meio,
      rotulo: FORMATADOR.format(Math.round(meio * 10) / 10),
    });
  }

  return { minimo, maximo, meio, linhas };
}

export function mapearPontos(
  valores: ValorParaGrafico[],
  largura: number,
  altura: number,
  margem = 36,
): PontoGrafico[] {
  const disponiveis = [...valores]
    .filter((valor) => valor.valor !== null)
    .sort((a, b) => a.ano - b.ano);

  if (disponiveis.length === 0) {
    return [];
  }

  const quantidade = disponiveis.length;
  const x = (indice: number) =>
    quantidade === 1 ? largura / 2 : margem + (indice * (largura - 2 * margem)) / (quantidade - 1);

  const numeros = disponiveis.map((valor) => valor.valor as number);
  const minimo = Math.min(...numeros);
  const maximo = Math.max(...numeros);

  const y = (numero: number) =>
    maximo === minimo
      ? altura / 2
      : altura - margem - ((numero - minimo) / (maximo - minimo)) * (altura - 2 * margem);

  return disponiveis.map((item, indice) => {
    const val = item.valor as number;
    const px = x(indice);
    const py = y(val);
    const rotuloY = py <= margem + 10 ? py + 18 : py - 12;

    return {
      ano: item.ano,
      valor: val,
      x: px,
      y: py,
      rotuloX: px,
      rotuloY,
      textoRotulo: FORMATADOR.format(val),
    };
  });
}

export function construirLinha(pontos: PontoGrafico[]): string {
  if (pontos.length < 2) {
    return '';
  }
  return pontos
    .map(
      (ponto, indice) => `${indice === 0 ? 'M' : 'L'} ${ponto.x.toFixed(2)} ${ponto.y.toFixed(2)}`,
    )
    .join(' ');
}
