/**
 * Formatação de metadados de arquivo para a página `/dados/` (feature 016).
 *
 * Fica em `src/lib/` e não no template porque os testes precisam verificá-la sem
 * renderizar Astro, e porque o mesmo formato é usado pelo cartão e pela tabela
 * de insumos — duas formatções divergentes para o mesmo campo é como um
 * "18 MB" e um "18,0 MB" aparecem lado a lado.
 */

/** Formata bytes em uma escala legível, em pt-BR. */
export function formatarBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return '—';

  const unidades = ['B', 'KB', 'MB', 'GB'];
  let valor = bytes;
  let indice = 0;
  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice += 1;
  }

  // Uma casa decimal a partir de KB. Em bytes inteiros não faz sentido — "1,0 B"
  // sugere medição que não houve.
  const casas = indice === 0 ? 0 : 1;
  const numero = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
  return `${numero} ${unidades[indice]}`;
}

/**
 * Formata uma data de modificação em pt-BR.
 *
 * `en-US` fica explícito de propósito: sem locale o Node usa o locale do host,
 * e o build de CI pode rodar em `en-US` enquanto o site é pt-BR — a mesma
 * página sairia em formatos diferentes em máquinas diferentes.
 */
export function formatarDataArquivo(data: Date | null): string {
  if (data === null) return '—';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** Cobertura de anos em texto curto: "2024 a 2026" ou "2026". */
export function formatarAnos(anos: number[]): string {
  if (anos.length === 0) return '—';
  const ordenados = [...anos].sort((a, b) => a - b);
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  return primeiro === ultimo ? `${primeiro}` : `${primeiro} a ${ultimo}`;
}

/** Cobertura de campus em texto curto: "todos" ou a lista slugs. */
export function formatarCampi(campi: string[]): string {
  if (campi.length === 0) return '—';
  if (campi.includes('todos')) return 'todos';
  return campi.join(', ');
}

/** Rótulo de formato a partir do nome do arquivo. */
export function formatarFormato(arquivo: string): string {
  const ponto = arquivo.lastIndexOf('.');
  if (ponto === -1) return '—';
  return arquivo.slice(ponto + 1).toUpperCase();
}
