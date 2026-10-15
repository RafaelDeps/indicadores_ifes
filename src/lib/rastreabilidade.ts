import * as path from 'node:path';
import {
  carregarDownloads,
  descobrirInsumos,
  obterInsumosCadeia,
  portaoAberto,
  avisoVisitante,
  type NaturezaArtefato,
} from './downloads';
import { formatDataArquivo } from './formatters';

/**
 * Rastreabilidade da memória de cálculo (spec 025, US3).
 *
 * Reutiliza INTEIRAMENTE as regras da página `/dados` (`src/lib/downloads.ts`):
 * disponibilidade por existência real em disco + portão de governança
 * fail-closed. Esta camada só filtra o mapa pilar → artefatos e formata a
 * proveniência — nenhuma regra de publicação é duplicada aqui (invariantes 5
 * e 7 do data-model).
 */

const ARTEFATOS_COMUNS = ['data/dist/indicadores.zip', 'data/canonical/exports_canonical.zip'];

/**
 * Única fonte do mapa pilar → artefatos de origem (research D-4):
 * - todos os pilares consomem o pacote agregado canônico e o export canônico
 *   (origem de toda a cadeia);
 * - apenas o Pilar 1 (engajamento: NTPP, QSPP, PIES, PICOT) consome as
 *   planilhas de matrícula (`listagem_*`), que alimentam NEP/NTE/PRE/SUPP.
 */
export const MAPA_PILAR_ARTEFATOS: Record<1 | 2 | 3, string[]> = {
  1: [...ARTEFATOS_COMUNS, 'data/raw/listagem_*.xlsx'],
  2: [...ARTEFATOS_COMUNS],
  3: [...ARTEFATOS_COMUNS],
};

export interface ItemRastreabilidade {
  id: string;
  arquivo: string;
  rotulo: string;
  natureza: NaturezaArtefato;
  caminhoPublico: string;
  disponivel: boolean;
  motivoIndisponivel: string | null;
  bytes: number | null;
  atualizadoEmFormatado: string;
  origem: string | null;
  revisao: string | null;
  anos: number[];
  campi: string[];
}

export interface RastreabilidadePilar {
  pilarNumero: 1 | 2 | 3;
  /** Âncora para os atalhos das citações nas memórias (ex.: 'rastreabilidade-pilar-1'). */
  secaoId: string;
  portaoAberto: boolean;
  /** Texto do visitante quando o portão está fechado; `null` quando aberto. */
  avisoPortao: string | null;
  artefatos: ItemRastreabilidade[];
}

export function obterRastreabilidadePilar(
  pilarNumero: 1 | 2 | 3,
  raizRepo: string = process.cwd(),
): RastreabilidadePilar {
  const gateAberto = portaoAberto(raizRepo);
  const artefatosDownload = carregarDownloads({ raizRepo, gateAberto });
  const insumos = obterInsumosCadeia(raizRepo);
  const insumoPorArquivo = new Map(
    insumos.map((insumo) => [path.basename(insumo.caminho), insumo]),
  );

  const padroes = MAPA_PILAR_ARTEFATOS[pilarNumero];
  const correspondeAoPilar = (origem: string): boolean =>
    padroes.some((padrao) => {
      if (!padrao.includes('*')) {
        return origem === padrao;
      }
      // Padrão glob simples: '*' casa com qualquer sequência (ex.:
      // 'data/raw/listagem_*.xlsx' → 'data/raw/listagem_2025_1.xlsx').
      const regex = new RegExp(
        `^${padrao.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
      );
      return regex.test(origem);
    });

  // `carregarDownloads` não devolve a origem; o id permite reconstruí-la:
  // 'pacote-oficial' | 'insumo-<nome do arquivo>'.
  const origens = descobrirInsumos(raizRepo);

  const artefatos: ItemRastreabilidade[] = [];
  for (const artefato of artefatosDownload) {
    const origem =
      artefato.id === 'pacote-oficial'
        ? 'data/dist/indicadores.zip'
        : origens.find((candidata) => path.basename(candidata) === artefato.arquivo);

    if (!origem || !correspondeAoPilar(origem)) {
      continue;
    }

    const insumo = insumoPorArquivo.get(artefato.arquivo);
    artefatos.push({
      id: artefato.id,
      arquivo: artefato.arquivo,
      rotulo: artefato.rotulo,
      natureza: artefato.natureza,
      caminhoPublico: artefato.caminhoPublico,
      disponivel: artefato.disponivel,
      motivoIndisponivel: artefato.motivoIndisponivel,
      bytes: artefato.bytes,
      atualizadoEmFormatado: formatDataArquivo(artefato.atualizadoEm),
      origem: insumo?.origem ?? null,
      revisao: insumo?.revisao ?? null,
      anos: artefato.anos,
      campi: artefato.campi,
    });
  }

  return {
    pilarNumero,
    secaoId: `rastreabilidade-pilar-${pilarNumero}`,
    portaoAberto: gateAberto,
    avisoPortao: gateAberto ? null : avisoVisitante(raizRepo),
    artefatos,
  };
}
