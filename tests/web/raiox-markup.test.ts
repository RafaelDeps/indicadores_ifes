import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('raiox-markup: asserções de fonte sobre RaioXDrawer e BotaoRaioX (T012)', () => {
  const caminhoDrawer = path.resolve('src/components/RaioXDrawer.astro');
  const caminhoBotao = path.resolve('src/components/BotaoRaioX.astro');

  it('RaioXDrawer possui estrutura de diálogo acessível e hooks obrigatórios', () => {
    const conteudo = fs.readFileSync(caminhoDrawer, 'utf-8');

    expect(conteudo).toContain('data-raiox-dialog');
    expect(conteudo).toContain('role="dialog"');
    expect(conteudo).toContain('aria-modal="true"');
    expect(conteudo).toContain('data-raiox-titulo');
    expect(conteudo).toContain('data-raiox-fechar');
    expect(conteudo).toContain('data-raiox-tablist');
    expect(conteudo).not.toContain('data-raiox-aviso-dados');
    expect(conteudo).toContain('data-raiox-rodape-formula');
    expect(conteudo).toContain('data-raiox-proveniencia');
  });

  it('BotaoRaioX renderiza gatilho com data-raiox-trigger e rótulo pt-BR', () => {
    const conteudo = fs.readFileSync(caminhoBotao, 'utf-8');

    expect(conteudo).toContain('data-raiox-trigger');
    expect(conteudo).toContain('type="button"');
    expect(conteudo).toContain('Raio-X do Indicador');
  });

  it('Páginas de pilares contêm BotaoRaioX e RaioXDrawer', () => {
    for (const pilar of [1, 2, 3]) {
      const caminhoPilar = path.resolve(`src/pages/pilar-${pilar}/index.astro`);
      const conteudo = fs.readFileSync(caminhoPilar, 'utf-8');
      expect(conteudo).toContain('BotaoRaioX');
      expect(conteudo).toContain('RaioXDrawer');
      expect(conteudo).toContain('celula-indicador');
    }
  });
});
