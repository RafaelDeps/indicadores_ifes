import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function arquivosAstro(diretorio: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = `${diretorio}/${entrada.name}`;
    if (entrada.isDirectory()) {
      encontrados.push(...arquivosAstro(caminho));
    } else if (entrada.name.endsWith('.astro')) {
      encontrados.push(caminho);
    }
  }
  return encontrados;
}

describe('Auditoria de Remoções e Elementos Descontinuados', () => {
  it('não possui rotas nem arquivos de exportação CSV ou JSON', () => {
    expect(existsSync('src/pages/pilar-1/[sigla]/dados.csv.ts')).toBe(false);
    expect(existsSync('src/pages/pilar-1/[sigla]/dados.json.ts')).toBe(false);
    expect(existsSync('src/components/ExportLinks.astro')).toBe(false);
    expect(existsSync('src/lib/exportacao.ts')).toBe(false);
    expect(existsSync('tests/exportacao.test.ts')).toBe(false);
  });

  it('não exibe botões nem links de exportação CSV/JSON na interface', () => {
    const arquivos = [...arquivosAstro('src/components'), ...arquivosAstro('src/pages')];
    for (const arq of arquivos) {
      const conteudo = readFileSync(arq, 'utf-8');
      expect(conteudo).not.toContain('Baixar CSV');
      expect(conteudo).not.toContain('Baixar JSON');
      expect(conteudo).not.toContain('ExportLinks');
    }
  });

  it('não exibe o campo "Fonte dos dados" em nenhum componente ou página', () => {
    const arquivos = [...arquivosAstro('src/components'), ...arquivosAstro('src/pages')];
    for (const arq of arquivos) {
      const conteudo = readFileSync(arq, 'utf-8');
      expect(conteudo).not.toContain('Fonte dos dados');
    }
  });

  it('possui injeção de script do plugin UserWay no layout', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf-8');
    expect(layout.toLowerCase()).toContain('userway');
  });

  it('possui injeção de script do Google Analytics (gtag) no layout', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf-8');
    expect(layout).toContain('googletagmanager.com/gtag/js');
    expect(layout).toContain('G-ETH675FGB0');
  });

  it('não possui arquivos de dados legados nos pilares 2 e 3', () => {
    expect(existsSync('src/pages/pilar-2/[sigla]/dados.csv.ts')).toBe(false);
    expect(existsSync('src/pages/pilar-2/[sigla]/dados.json.ts')).toBe(false);
    expect(existsSync('src/pages/pilar-3/[sigla]/dados.csv.ts')).toBe(false);
    expect(existsSync('src/pages/pilar-3/[sigla]/dados.json.ts')).toBe(false);
  });
});
