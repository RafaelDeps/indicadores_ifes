import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { executarEtl } from '../../src/etl/main';
import { criarZipDeterministico } from '../../src/etl/zipwriter';
import { pacoteCanonicosFixture } from './fixtures';

function criarBaseFixture(entradas?: Array<{ nome: string; conteudo: string }>): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-cli-'));
  const conteudos =
    entradas ??
    Object.entries(pacoteCanonicosFixture()).map(([nome, dados]) => ({
      nome,
      conteudo: JSON.stringify(dados),
    }));
  fs.writeFileSync(path.join(tmp, 'exports_canonical.zip'), criarZipDeterministico(conteudos));
  return tmp;
}

function capturarLogger() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    logger: {
      log: (m: string) => stdout.push(m),
      warn: (m: string) => stderr.push(m),
      error: (m: string) => stderr.push(m),
    },
  };
}

describe('CLI npm run etl (contrato etl-cli.md, FR-013)', () => {
  it('sucesso: exit 0, resumo pt-BR no stdout, nada no stderr além de avisos prefixados', () => {
    const base = criarBaseFixture();
    const { stdout, stderr, logger } = capturarLogger();
    const resultado = executarEtl({ dirBase: base, logger });

    expect(resultado.codigoSaida).toBe(0);
    expect(stdout).toHaveLength(1);
    expect(stdout[0]).toMatch(
      /^ETL concluído: 36 arquivos gerados \(3 campi \+ todos\), anos 2024–2026\.$/,
    );
    for (const linha of stderr) {
      expect(linha.startsWith('AVISO:')).toBe(true);
    }
  });

  it('entrada ausente: exit 1, ERRO: no stderr, nenhum resumo no stdout', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-cli-vazio-'));
    const { stdout, stderr, logger } = capturarLogger();
    const resultado = executarEtl({ dirBase: base, logger });

    expect(resultado.codigoSaida).toBe(1);
    expect(resultado.resumo).toBeNull();
    expect(stdout).toHaveLength(0);
    expect(stderr.some((l) => l.startsWith('ERRO:'))).toBe(true);
    expect(stderr.some((l) => l.includes('exports_canonical.zip'))).toBe(true);
  });

  it('conjunto canônico ausente: exit 1 citando o arquivo faltante', () => {
    const base = criarBaseFixture(
      Object.entries(pacoteCanonicosFixture())
        .filter(([nome]) => nome !== 'articles_canonical.json')
        .map(([nome, dados]) => ({ nome, conteudo: JSON.stringify(dados) })),
    );
    const { stderr, logger } = capturarLogger();
    const resultado = executarEtl({ dirBase: base, logger });

    expect(resultado.codigoSaida).toBe(1);
    expect(stderr.some((l) => l.includes('articles_canonical.json'))).toBe(true);
  });

  it('avisos têm prefixo AVISO: (não interrompem a execução)', () => {
    const base = criarBaseFixture();
    const { stderr, logger } = capturarLogger();
    const resultado = executarEtl({ dirBase: base, logger });

    expect(resultado.codigoSaida).toBe(0);
    expect(stderr.length).toBeGreaterThan(0);
    expect(stderr.every((l) => l.startsWith('AVISO:'))).toBe(true);
  });
});
