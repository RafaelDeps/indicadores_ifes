export interface OpcoesExportacaoImagem {
  elementoSvg: SVGSVGElement;
  tituloIndicador: string;
  siglaIndicador: string;
  campus?: string;
  largura?: number;
  altura?: number;
}

/**
 * Converte o elemento SVG do gráfico histórico em uma imagem PNG institucional
 * de alta resolução com cabeçalho oficial e dispara o download no cliente.
 */
export async function exportarGraficoParaPng(opcoes: OpcoesExportacaoImagem): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const {
    elementoSvg,
    tituloIndicador,
    siglaIndicador,
    campus = 'Campus Serra',
    largura = 800,
    altura = 480,
  } = opcoes;

  // Clona o SVG para isolar as alterações visuais para exportação
  const clone = elementoSvg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', '740');
  clone.setAttribute('height', '330');

  // Ajusta cores no SVG clonado para garantir fundo claro institucional
  clone.style.background = 'transparent';
  clone.style.border = 'none';

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    URL.revokeObjectURL(svgUrl);
    return;
  }

  // 1. Fundo institucional sólido branco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, largura, altura);

  // 2. Barra verde de destaque no topo
  ctx.fillStyle = '#178447';
  ctx.fillRect(0, 0, largura, 6);

  // 3. Cabeçalho Institucional
  ctx.fillStyle = '#178447';
  ctx.font = '700 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`IFES — ${campus.toUpperCase()}`, 30, 34);

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 18px system-ui, -apple-system, sans-serif';
  const tituloCompleto = `${tituloIndicador} (${siglaIndicador})`;
  ctx.fillText(tituloCompleto, 30, 58);

  // Linha sutil separadora abaixo do cabeçalho
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 72);
  ctx.lineTo(largura - 30, 72);
  ctx.stroke();

  // 4. Renderização do SVG do gráfico
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 30, 85, 740, 335);
      resolve();
    };
    img.onerror = (err) => reject(err);
    img.src = svgUrl;
  });

  URL.revokeObjectURL(svgUrl);

  // 5. Rodapé Institucional
  const dataHoje = new Intl.DateTimeFormat('pt-BR').format(new Date());
  ctx.fillStyle = '#64748b';
  ctx.font = '500 11px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    `Fonte: Indicadores CONIF • IFES ${campus} • Consulta em ${dataHoje}`,
    30,
    altura - 22,
  );

  // 6. Conversão para PNG e download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const pngUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `ifes_${campus.toLowerCase().replace(/\s+/g, '_')}_${siglaIndicador.toLowerCase()}_grafico.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(pngUrl);
  }, 'image/png');
}
