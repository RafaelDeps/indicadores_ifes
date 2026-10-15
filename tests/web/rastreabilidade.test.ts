import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAPA_PILAR_ARTEFATOS, obterRastreabilidadePilar } from '../../src/lib/rastreabilidade';

const YAML_PORTAO_ABERTO =
  'pendencias:\n  - id: teste\n    descricao: t\n    registro: marcador.txt\n';

function criarRaizTemporaria(estrutura: Record<string, string | Buffer>): string {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'rastreabilidade-'));
  for (const [caminhoRelativo, conteudo] of Object.entries(estrutura)) {
    const absoluto = path.join(raiz, caminhoRelativo);
    fs.mkdirSync(path.dirname(absoluto), { recursive: true });
    fs.writeFileSync(absoluto, conteudo);
  }
  return raiz;
}

describe('MAPA_PILAR_ARTEFATOS (spec 025, research D-4)', () => {
  it('todos os pilares recebem o pacote agregado e o export canônico', () => {
    for (const pilar of [1, 2, 3] as const) {
      expect(MAPA_PILAR_ARTEFATOS[pilar]).toContain('data/dist/indicadores.zip');
      expect(MAPA_PILAR_ARTEFATOS[pilar]).toContain('data/canonical/exports_canonical.zip');
    }
  });

  it('só o pilar 1 recebe as listagens de matrícula', () => {
    expect(MAPA_PILAR_ARTEFATOS[1].some((p) => p.includes('listagem_'))).toBe(true);
    expect(MAPA_PILAR_ARTEFATOS[2].some((p) => p.includes('listagem_'))).toBe(false);
    expect(MAPA_PILAR_ARTEFATOS[3].some((p) => p.includes('listagem_'))).toBe(false);
  });
});

describe('obterRastreabilidadePilar (spec 025, US3)', () => {
  it('portão aberto: pacote agregado disponível e listagens com proveniência completa (FR-007, FR-009)', () => {
    const raiz = criarRaizTemporaria({
      'data/dist/indicadores.zip': Buffer.from('PK-fake'),
      'data/canonical/exports_canonical.zip': Buffer.from('PK-fake'),
      'data/raw/listagem_2025_1.xlsx': Buffer.from('xlsx'),
      'marcador.txt': 'ok',
      '.specify/governanca/pendencias.yaml': YAML_PORTAO_ABERTO,
    });

    const rastreabilidade = obterRastreabilidadePilar(1, raiz);
    expect(rastreabilidade.pilarNumero).toBe(1);
    expect(rastreabilidade.secaoId).toBe('rastreabilidade-pilar-1');
    expect(rastreabilidade.portaoAberto).toBe(true);
    expect(rastreabilidade.avisoPortao).toBeNull();

    const pacote = rastreabilidade.artefatos.find((a) => a.arquivo === 'indicadores.zip');
    expect(pacote).toBeDefined();
    expect(pacote!.disponivel).toBe(true);
    expect(pacote!.caminhoPublico).toBe('dados/indicadores.zip');
    expect(pacote!.natureza).toBe('agregado');

    const listagem = rastreabilidade.artefatos.find((a) => a.arquivo === 'listagem_2025_1.xlsx');
    expect(listagem).toBeDefined();
    expect(listagem!.disponivel).toBe(true);
    expect(listagem!.origem).toContain('Emissão institucional');
    expect(listagem!.revisao).toBe('2025-1');
    expect(listagem!.atualizadoEmFormatado).not.toBe('Dado indisponível');
    expect(listagem!.bytes).toBe(4);

    // Pilares 2 e 3 não recebem listagens
    const pilar2 = obterRastreabilidadePilar(2, raiz);
    expect(pilar2.artefatos.find((a) => a.arquivo.startsWith('listagem_'))).toBeUndefined();
    const pilar3 = obterRastreabilidadePilar(3, raiz);
    expect(pilar3.artefatos.find((a) => a.arquivo.startsWith('listagem_'))).toBeUndefined();

    fs.rmSync(raiz, { recursive: true, force: true });
  });

  it('portão fechado (registro ausente): insumos brutos indisponíveis com motivo pt-BR e aviso do visitante; agregado segue disponível (fail-closed, FR-008)', () => {
    const raiz = criarRaizTemporaria({
      'data/dist/indicadores.zip': Buffer.from('PK-fake'),
      'data/canonical/exports_canonical.zip': Buffer.from('PK-fake'),
    });

    const rastreabilidade = obterRastreabilidadePilar(1, raiz);
    expect(rastreabilidade.portaoAberto).toBe(false);
    expect(rastreabilidade.avisoPortao).toBeTruthy();

    const canonico = rastreabilidade.artefatos.find((a) => a.arquivo === 'exports_canonical.zip');
    expect(canonico).toBeDefined();
    expect(canonico!.disponivel).toBe(false);
    expect(canonico!.motivoIndisponivel).toContain('governança');

    const pacote = rastreabilidade.artefatos.find((a) => a.arquivo === 'indicadores.zip');
    expect(pacote!.disponivel).toBe(true);

    fs.rmSync(raiz, { recursive: true, force: true });
  });

  it('arquivo ausente declarado no manifesto: item listado como indisponível com motivo, nunca um link quebrado', () => {
    const raiz = criarRaizTemporaria({
      'data/dist/indicadores.zip': Buffer.from('PK-fake'),
      'marcador.txt': 'ok',
      'dados-insumo.yml': 'arquivos:\n  - nome: listagem_2024_1.xlsx\n',
      '.specify/governanca/pendencias.yaml': YAML_PORTAO_ABERTO,
    });

    const rastreabilidade = obterRastreabilidadePilar(1, raiz);
    const listagem = rastreabilidade.artefatos.find((a) => a.arquivo === 'listagem_2024_1.xlsx');
    expect(listagem).toBeDefined();
    expect(listagem!.disponivel).toBe(false);
    expect(listagem!.motivoIndisponivel).toContain('não foi encontrado');
    expect(listagem!.atualizadoEmFormatado).toBe('Dado indisponível');
    expect(listagem!.bytes).toBeNull();

    fs.rmSync(raiz, { recursive: true, force: true });
  });
});
