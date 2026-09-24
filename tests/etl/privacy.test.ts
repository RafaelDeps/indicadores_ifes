import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { extrairZip } from '../../src/lib/zip';
import { executarEtl } from '../../src/etl/main';
import { criarZipDeterministico } from '../../src/etl/zipwriter';
import { pacoteCanonicosFixture, PESSOAS_FIXTURE } from './fixtures';

const loggerSilencioso = { log: () => {}, warn: () => {}, error: () => {} };

function gerarPacote(): Map<string, string> {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-priv-'));
  const entradas = Object.entries(pacoteCanonicosFixture()).map(([nome, dados]) => ({
    nome,
    conteudo: JSON.stringify(dados),
  }));
  fs.writeFileSync(path.join(base, 'exports_canonical.zip'), criarZipDeterministico(entradas));
  const resultado = executarEtl({ dirBase: base, logger: loggerSilencioso });
  expect(resultado.codigoSaida).toBe(0);
  return extrairZip(path.join(base, 'indicadores.zip'));
}

describe('privacidade (Princípio IV, FR-015)', () => {
  const mapa = gerarPacote();
  const nomesPessoas = PESSOAS_FIXTURE.map((p) => p.name);

  it('nenhum nome de pessoa do registro aparece nos arquivos gerados', () => {
    for (const [nome, conteudo] of mapa) {
      for (const nomePessoa of nomesPessoas) {
        expect(conteudo.includes(nomePessoa), `${nome} contém "${nomePessoa}"`).toBe(false);
      }
    }
  });

  it('nenhum campo além dos previstos pelo contrato por indicador', () => {
    const camposPorPilar: Record<number, Set<string>> = {
      1: new Set(['NTPP', 'QSPP', 'PIES', 'PICOT']),
      2: new Set(['PINV', 'PIPDI']),
      3: new Set(['PIPRO', 'PIPROT', 'PIPROTR']),
    };
    for (const [nomeArquivo, conteudo] of mapa) {
      const numeroPilar = parseInt(nomeArquivo.match(/^pilar([123])_/)![1], 10);
      const dados = JSON.parse(conteudo);
      expect(new Set(Object.keys(dados))).toEqual(
        new Set(['campus', 'ano_referencia', 'pilar', 'indicadores']),
      );
      for (const sigla of Object.keys(dados.indicadores)) {
        expect(camposPorPilar[numeroPilar].has(sigla), `${nomeArquivo}: ${sigla}`).toBe(true);
      }
    }
  });
});
