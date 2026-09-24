import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { extrairZip } from '../../src/lib/zip';
import { crc32, criarZipDeterministico, gravarZipAtomico } from '../../src/etl/zipwriter';

describe('crc32 (IEEE 802.3)', () => {
  it('calcula o vetor de teste conhecido', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });

  it('retorna 0 para buffer vazio', () => {
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });
});

describe('criarZipDeterministico', () => {
  const entradas = [
    { nome: 'pilar2_todos_2024.json', conteudo: '{"campus":"Todos os Campi"}' },
    { nome: 'pilar1_serra_2024.json', conteudo: '{"campus":"Serra"}' },
  ];

  it('produz arquivo legível pelo extrairZip existente', () => {
    const zip = criarZipDeterministico(entradas);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-zip-'));
    const caminho = path.join(tmp, 'saida.zip');
    fs.writeFileSync(caminho, zip);
    const mapa = extrairZip(caminho);
    expect(mapa.get('pilar1_serra_2024.json')).toBe('{"campus":"Serra"}');
    expect(mapa.get('pilar2_todos_2024.json')).toBe('{"campus":"Todos os Campi"}');
  });

  it('é byte-idêntico entre chamadas (ordenação estável por nome)', () => {
    const a = criarZipDeterministico(entradas);
    const b = criarZipDeterministico([...entradas].reverse());
    expect(a.equals(b)).toBe(true);
  });

  it('usa método STORE (0) e datas fixas de 1980-01-01', () => {
    const zip = criarZipDeterministico(entradas);
    // Cabeçalho local: sig(4) versão(2) flags(2) método(2) hora(2) data(2)
    expect(zip.readUInt16LE(8)).toBe(0); // STORE
    expect(zip.readUInt16LE(10)).toBe(0); // hora 00:00
    expect(zip.readUInt16LE(12)).toBe(0x21); // data 1980-01-01
  });
});

describe('gravarZipAtomico', () => {
  it('grava o zip no caminho alvo', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-zipw-'));
    const caminho = path.join(tmp, 'indicadores.zip');
    gravarZipAtomico(caminho, [{ nome: 'a.json', conteudo: '{}' }]);
    expect(fs.existsSync(caminho)).toBe(true);
    expect(extrairZip(caminho).get('a.json')).toBe('{}');
  });

  it('não deixa arquivos temporários residuais', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-zipw2-'));
    const caminho = path.join(tmp, 'indicadores.zip');
    gravarZipAtomico(caminho, [{ nome: 'a.json', conteudo: '{}' }]);
    expect(fs.readdirSync(tmp)).toEqual(['indicadores.zip']);
  });
});
