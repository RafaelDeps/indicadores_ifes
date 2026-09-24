import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { criarZipDeterministico } from '../../src/etl/zipwriter';
import { carregarExportCanonicos } from '../../src/etl/load';
import {
  ARTIGOS_FIXTURE,
  AUTORES_PRODUCAO_FIXTURE,
  CAMPI_FIXTURE,
  INICIATIVAS_FIXTURE,
  PESSOAS_FIXTURE,
  PRODUCOES_FIXTURE,
  TIPOS_PRODUCAO_FIXTURE,
} from './fixtures';

const NOMES_ARQUIVOS = [
  'initiatives_canonical.json',
  'researchers_canonical.json',
  'students_canonical.json',
  'campuses_canonical.json',
  'articles_canonical.json',
  'research_productions_canonical.json',
  'production_authors_canonical.json',
  'production_types_canonical.json',
];

function criarZipTmp(conteudos: Record<string, unknown>): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-load-'));
  const caminho = path.join(tmp, 'exports_canonical.zip');
  const entradas = Object.entries(conteudos).map(([nome, dados]) => ({
    nome,
    conteudo: JSON.stringify(dados),
  }));
  fs.writeFileSync(caminho, criarZipDeterministico(entradas));
  return caminho;
}

function pacoteCompleto(): Record<string, unknown> {
  return {
    'initiatives_canonical.json': INICIATIVAS_FIXTURE,
    'researchers_canonical.json': PESSOAS_FIXTURE,
    'students_canonical.json': [
      {
        id: 3,
        name: 'Estudante Tres',
        classification: 'student',
        campus: { id: 2, name: 'Serra' },
      },
    ],
    'campuses_canonical.json': CAMPI_FIXTURE,
    'articles_canonical.json': ARTIGOS_FIXTURE,
    'research_productions_canonical.json': PRODUCOES_FIXTURE,
    'production_authors_canonical.json': AUTORES_PRODUCAO_FIXTURE,
    'production_types_canonical.json': TIPOS_PRODUCAO_FIXTURE,
  };
}

describe('carregarExportCanonicos', () => {
  it('carrega os 8 conjuntos canônicos obrigatórios', () => {
    const exportacao = carregarExportCanonicos(criarZipTmp(pacoteCompleto()));
    expect(exportacao.iniciativas).toHaveLength(INICIATIVAS_FIXTURE.length);
    expect(exportacao.pessoas).toHaveLength(PESSOAS_FIXTURE.length);
    expect(exportacao.campi).toHaveLength(CAMPI_FIXTURE.length);
    expect(exportacao.artigos).toHaveLength(ARTIGOS_FIXTURE.length);
    expect(exportacao.producoes).toHaveLength(PRODUCOES_FIXTURE.length);
    expect(exportacao.autoresProducao).toHaveLength(AUTORES_PRODUCAO_FIXTURE.length);
    expect(exportacao.tiposProducao).toHaveLength(TIPOS_PRODUCAO_FIXTURE.length);
  });

  it('deduplica registros por id e registra aviso', () => {
    const duplicado = {
      ...pacoteCompleto(),
      'initiatives_canonical.json': [
        INICIATIVAS_FIXTURE[0],
        { ...INICIATIVAS_FIXTURE[0], name: 'cópia' },
      ],
    };
    const exportacao = carregarExportCanonicos(criarZipTmp(duplicado));
    expect(exportacao.iniciativas).toHaveLength(1);
    expect(exportacao.iniciativas[0].name).toBe(INICIATIVAS_FIXTURE[0].name);
    expect(exportacao.avisos.some((a) => a.includes('1'))).toBe(true);
  });

  it('falha com ERRO quando um conjunto obrigatório está ausente', () => {
    const incompleto = pacoteCompleto();
    delete (incompleto as Record<string, unknown>)['campuses_canonical.json'];
    expect(() => carregarExportCanonicos(criarZipTmp(incompleto))).toThrow(
      /ERRO.*campuses_canonical\.json/,
    );
  });

  it('falha com ERRO em zip corrompido', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-corrupt-'));
    const caminho = path.join(tmp, 'exports_canonical.zip');
    fs.writeFileSync(caminho, Buffer.from('isso nao e um zip'));
    expect(() => carregarExportCanonicos(caminho)).toThrow(/ERRO/);
  });

  it('exige exatamente os 8 nomes canônicos', () => {
    carregarExportCanonicos(criarZipTmp(pacoteCompleto()));
    for (const nome of NOMES_ARQUIVOS) {
      expect(NOMES_ARQUIVOS).toContain(nome);
    }
    expect(NOMES_ARQUIVOS).toHaveLength(8);
  });
});
