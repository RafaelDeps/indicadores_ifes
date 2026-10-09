export interface ItemSerieCsv {
  ano: number;
  valor: number | null;
  motivoIndisponivel?: string;
}

export interface DadosExportacaoCsv {
  campus: string;
  indicadorNome: string;
  sigla: string;
  unidade: string;
  serie: ItemSerieCsv[];
}

/**
 * Formata um número para o padrão pt-BR (vírgula como separador decimal).
 */
function formatarNumeroCsv(valor: number): string {
  // Evita casas decimais extras desnecessárias mantendo precisão
  const str = String(valor);
  return str.replace('.', ',');
}

/**
 * Gera o conteúdo em string de uma planilha CSV no padrão brasileiro (UTF-8 com BOM e separador ;)
 */
export function gerarCsvSerieHistorica(dados: DadosExportacaoCsv): string {
  const BOM = '\uFEFF';
  const cabecalho = 'Campus;Ano;Indicador;Sigla;Valor;Unidade;Status';

  const ordenados = [...dados.serie].sort((a, b) => a.ano - b.ano);

  const linhas = ordenados.map((item) => {
    const isDisponivel = item.valor !== null && item.valor !== undefined;
    const valorFormatado = isDisponivel ? formatarNumeroCsv(item.valor as number) : '';
    const status = isDisponivel ? 'Apurado' : 'Dado indisponível';

    return [
      dados.campus,
      item.ano,
      dados.indicadorNome,
      dados.sigla,
      valorFormatado,
      dados.unidade,
      status,
    ].join(';');
  });

  return BOM + [cabecalho, ...linhas].join('\r\n');
}

/**
 * Dispara o download de um arquivo de texto/blob no navegador do cliente.
 */
export function dispararDownloadArquivo(
  conteudo: string,
  nomeArquivo: string,
  mimeType = 'text/csv;charset=utf-8;',
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([conteudo], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
