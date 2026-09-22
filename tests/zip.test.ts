import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { extrairZip, lerArquivoZipComoJson } from '../src/lib/zip';

describe('Parser ZIP Nativo (src/lib/zip.ts)', () => {
  const zipPath = path.resolve(process.cwd(), 'indicadores.zip');

  it('deve extrair os arquivos contidos em indicadores.zip', () => {
    expect(fs.existsSync(zipPath)).toBe(true);
    const arquivos = extrairZip(zipPath);

    expect(arquivos.size).toBeGreaterThanOrEqual(3);
    expect(arquivos.has('pilar1_serra_2026.json')).toBe(true);
    expect(arquivos.has('pilar2_serra_2026.json')).toBe(true);
    expect(arquivos.has('pilar3_serra_2026.json')).toBe(true);
  });

  it('deve decodificar o conteúdo JSON corretamente a partir do ZIP', () => {
    const jsonPilar1 = lerArquivoZipComoJson<{ campus: string; ano_referencia: number }>(
      zipPath,
      'pilar1_serra_2026.json',
    );

    expect(jsonPilar1.campus).toBe('Serra');
    expect(jsonPilar1.ano_referencia).toBe(2026);
  });

  it('deve lançar erro caso o arquivo ZIP não exista', () => {
    expect(() => extrairZip('arquivo_inexistente.zip')).toThrow();
  });

  it('deve lançar erro ao solicitar arquivo inexistente dentro do ZIP', () => {
    expect(() => lerArquivoZipComoJson(zipPath, 'inexistente.json')).toThrow();
  });
});
