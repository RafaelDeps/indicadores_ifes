import * as fs from 'node:fs';
import * as path from 'node:path';

const ASSINATURA_LOCAL = 0x04034b50;
const ASSINATURA_CENTRAL = 0x02014b50;
const ASSINATURA_EOCD = 0x06054b50;
const VERSAO = 20;
const METODO_STORE = 0;
const DOS_DATA = 0x0021;
const DOS_HORA = 0x0000;

const TABELA_CRC32 = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

export function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = TABELA_CRC32[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface EntradaZip {
  nome: string;
  conteudo: string;
}

export function criarZipBuffer(entradas: EntradaZip[]): Buffer {
  const partes: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  const ordenadas = [...entradas].sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0));

  for (const entrada of ordenadas) {
    const nome = Buffer.from(entrada.nome, 'utf8');
    const dados = Buffer.from(entrada.conteudo, 'utf8');
    const soma = crc32(dados);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(ASSINATURA_LOCAL, 0);
    local.writeUInt16LE(VERSAO, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(METODO_STORE, 8);
    local.writeUInt16LE(DOS_HORA, 10);
    local.writeUInt16LE(DOS_DATA, 12);
    local.writeUInt32LE(soma, 14);
    local.writeUInt32LE(dados.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nome.length, 26);
    local.writeUInt16LE(0, 28);
    partes.push(local, nome, dados);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(ASSINATURA_CENTRAL, 0);
    dir.writeUInt16LE(VERSAO, 4);
    dir.writeUInt16LE(VERSAO, 6);
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(METODO_STORE, 10);
    dir.writeUInt16LE(DOS_HORA, 12);
    dir.writeUInt16LE(DOS_DATA, 14);
    dir.writeUInt32LE(soma, 16);
    dir.writeUInt32LE(dados.length, 20);
    dir.writeUInt32LE(dados.length, 24);
    dir.writeUInt16LE(nome.length, 28);
    dir.writeUInt16LE(0, 30);
    dir.writeUInt16LE(0, 32);
    dir.writeUInt16LE(0, 34);
    dir.writeUInt16LE(0, 36);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nome);

    offset += local.length + nome.length + dados.length;
  }

  const diretorio = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(ASSINATURA_EOCD, 0);
  fim.writeUInt16LE(0, 4);
  fim.writeUInt16LE(0, 6);
  fim.writeUInt16LE(entradas.length, 8);
  fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(diretorio.length, 12);
  fim.writeUInt32LE(offset, 16);
  fim.writeUInt16LE(0, 20);

  return Buffer.concat([...partes, diretorio, fim]);
}

export function gravarZipAtomico(caminhoDestino: string, entradas: EntradaZip[]): void {
  const dir = path.dirname(caminhoDestino);
  const nomeTmp = `.tmp-${path.basename(caminhoDestino)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const caminhoTmp = path.join(dir, nomeTmp);

  const buffer = criarZipBuffer(entradas);
  fs.writeFileSync(caminhoTmp, buffer);
  fs.renameSync(caminhoTmp, caminhoDestino);
}
