import * as fs from 'node:fs';
import * as zlib from 'node:zlib';

/**
 * Lê e descompacta um arquivo ZIP padrão sem dependências externas,
 * suportando métodos STORE (0) e DEFLATE (8).
 */
export function extrairZip(caminhoOuBuffer: string | Buffer): Map<string, string> {
  const buffer =
    typeof caminhoOuBuffer === 'string' ? fs.readFileSync(caminhoOuBuffer) : caminhoOuBuffer;

  const arquivos = new Map<string, string>();
  let offset = 0;

  while (offset < buffer.length - 4) {
    const signature = buffer.readUInt32LE(offset);

    // Assinatura do cabeçalho de arquivo local: PK\x03\x04 (0x04034b50)
    if (signature === 0x04034b50) {
      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const fileNameLength = buffer.readUInt16LE(offset + 26);
      const extraFieldLength = buffer.readUInt16LE(offset + 28);

      const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLength);

      const dataStart = offset + 30 + fileNameLength + extraFieldLength;
      const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

      let contentBuffer: Buffer;
      if (compressionMethod === 0) {
        // STORE (sem compressão)
        contentBuffer = compressedData;
      } else if (compressionMethod === 8) {
        // DEFLATE
        contentBuffer = zlib.inflateRawSync(compressedData);
      } else {
        throw new Error(
          `Método de compressão não suportado no ZIP: ${compressionMethod} (${fileName})`,
        );
      }

      arquivos.set(fileName, contentBuffer.toString('utf8'));
      offset = dataStart + compressedSize;
    } else if (signature === 0x02014b50 || signature === 0x06054b50) {
      // Início do diretório central ou final do diretório central
      break;
    } else {
      offset++;
    }
  }

  return arquivos;
}

/**
 * Extrai e decodifica um arquivo JSON específico de dentro do arquivo ZIP.
 */
export function lerArquivoZipComoJson<T = unknown>(
  caminhoOuBuffer: string | Buffer,
  nomeArquivo: string,
): T {
  const arquivos = extrairZip(caminhoOuBuffer);
  const conteudo = arquivos.get(nomeArquivo);

  if (!conteudo) {
    throw new Error(`Arquivo "${nomeArquivo}" não foi encontrado dentro do pacote ZIP.`);
  }

  return JSON.parse(conteudo) as T;
}
