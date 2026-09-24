import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { extrairZip } from '../../src/lib/zip';
import { executarEtl } from '../../src/etl/main';
import { criarZipDeterministico } from '../../src/etl/zipwriter';
import { ANOS_ALVO, pacoteCanonicosFixture, SLUGS_ESPERADOS } from './fixtures';

function criarBaseFixture(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-pipeline-'));
  const entradas = Object.entries(pacoteCanonicosFixture()).map(([nome, dados]) => ({
    nome,
    conteudo: JSON.stringify(dados),
  }));
  fs.writeFileSync(path.join(tmp, 'exports_canonical.zip'), criarZipDeterministico(entradas));
  return tmp;
}

function loggerSilencioso() {
  return { log: () => {}, warn: () => {}, error: () => {} };
}

describe('executarEtl (integração ponta a ponta)', () => {
  it('gera indicadores.zip válido com exit 0 e resumo', () => {
    const base = criarBaseFixture();
    const resultado = executarEtl({ dirBase: base, logger: loggerSilencioso() });
    expect(resultado.codigoSaida).toBe(0);
    expect(resultado.resumo).toMatch(/ETL concluído: 36 arquivos gerados/);
    expect(fs.existsSync(path.join(base, 'indicadores.zip'))).toBe(true);
  });

  it('é determinístico: duas execuções produzem bytes idênticos', () => {
    const base = criarBaseFixture();
    executarEtl({ dirBase: base, logger: loggerSilencioso() });
    const primeira = fs.readFileSync(path.join(base, 'indicadores.zip'));
    executarEtl({ dirBase: base, logger: loggerSilencioso() });
    const segunda = fs.readFileSync(path.join(base, 'indicadores.zip'));
    expect(primeira.equals(segunda)).toBe(true);
  });

  it('cobertura: 3 pilares × campi + todos × 3 anos, com headers corretos', () => {
    const base = criarBaseFixture();
    executarEtl({ dirBase: base, logger: loggerSilencioso() });
    const mapa = extrairZip(path.join(base, 'indicadores.zip'));
    expect(mapa.size).toBe(36);

    const nomes = [...mapa.keys()];
    for (const nome of nomes) {
      expect(nome).toMatch(/^pilar[123]_[a-z0-9]+_\d{4}\.json$/);
    }
    for (const slug of SLUGS_ESPERADOS) {
      for (const ano of ANOS_ALVO) {
        for (const pilar of [1, 2, 3]) {
          expect(nomes).toContain(`pilar${pilar}_${slug}_${ano}.json`);
        }
      }
    }

    const dados = JSON.parse(mapa.get('pilar1_vitoria_2024.json')!);
    expect(dados.campus).toBe('Vitória');
    expect(dados.ano_referencia).toBe(2024);
    expect(dados.pilar).toBe('Engajamento Academico e Inclusao');
    expect(Object.keys(dados.indicadores).sort()).toEqual(['NTPP', 'PICOT', 'PIES', 'QSPP']);
  });

  it('entrada ausente → exit 1 com ERRO e sem alterar zip preexistente', () => {
    const base = criarBaseFixture();
    executarEtl({ dirBase: base, logger: loggerSilencioso() });
    const zipAntes = fs.readFileSync(path.join(base, 'indicadores.zip'));

    const baseVazia = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-vazio-'));
    const resultado = executarEtl({ dirBase: baseVazia, logger: loggerSilencioso() });
    expect(resultado.codigoSaida).toBe(1);
    expect(resultado.erros[0]).toMatch(/ERRO/);
    expect(fs.existsSync(path.join(baseVazia, 'indicadores.zip'))).toBe(false);
    expect(fs.readFileSync(path.join(base, 'indicadores.zip')).equals(zipAntes)).toBe(true);
  });

  it('entrada corrompida → exit 1 e zip preexistente intacto', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-corrupt-'));
    fs.writeFileSync(path.join(base, 'exports_canonical.zip'), Buffer.from('nao-e-zip'));
    fs.writeFileSync(path.join(base, 'indicadores.zip'), Buffer.from('zip-antigo'));
    const resultado = executarEtl({ dirBase: base, logger: loggerSilencioso() });
    expect(resultado.codigoSaida).toBe(1);
    expect(fs.readFileSync(path.join(base, 'indicadores.zip')).toString()).toBe('zip-antigo');
  });

  it('avisos de transformação chegam ao stderr (ids não resolvidos, datas inválidas)', () => {
    const base = criarBaseFixture();
    const avisos: string[] = [];
    const logger = { log: () => {}, warn: (m: string) => avisos.push(m), error: () => {} };
    executarEtl({ dirBase: base, logger });
    expect(avisos.some((a) => a.startsWith('AVISO:') && a.includes('iniciativa 4'))).toBe(true);
    expect(avisos.some((a) => a.startsWith('AVISO:') && a.includes('iniciativa 8'))).toBe(true);
  });

  it('varredura de fidelidade sobre 100% do pacote: 0 coerções null↔0', () => {
    const base = criarBaseFixture();
    executarEtl({ dirBase: base, logger: loggerSilencioso() });
    const mapa = extrairZip(path.join(base, 'indicadores.zip'));

    const camposNaoCalculaveis = [
      'NTE_total_estudantes_matriculados',
      'percentual_calculado_PIES',
      'NTECPP_cotistas_em_pesquisa',
      'percentual_calculado_PICOT',
      'TAFPPI_valor_total_aporte_pesquisa',
      'OCC_valor_orcamento_total_capital_custeio',
      'percentual_calculado_PINV',
      'NAPPCT_acordos_parceria_firmados',
      'total_acumulado_PIPDI',
      'total_transferidos_PIPROTR',
    ];
    let camposVerificados = 0;

    for (const conteudo of mapa.values()) {
      const dados = JSON.parse(conteudo) as {
        campus: string;
        ano_referencia: number;
        indicadores: Record<
          string,
          Record<string, unknown> & { valores_totais_por_tipo?: Record<string, unknown> }
        >;
      };
      for (const indicador of Object.values(dados.indicadores)) {
        for (const [campo, valor] of Object.entries(indicador)) {
          if (campo === 'descricao') continue;
          if (campo === 'valores_totais_por_tipo') {
            for (const v of Object.values(valor as Record<string, unknown>)) {
              expect(v === null || typeof v === 'number').toBe(true);
              camposVerificados += 1;
            }
            continue;
          }
          if (camposNaoCalculaveis.includes(campo)) {
            expect(valor, `${dados.campus}/${dados.ano_referencia}/${campo}`).toBeNull();
          } else {
            expect(valor === null || typeof valor === 'number').toBe(true);
          }
          camposVerificados += 1;
        }
      }
    }
    expect(camposVerificados).toBeGreaterThan(0);
  });
});
