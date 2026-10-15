import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fonte = readFileSync('src/components/MemoriaCalculo.astro', 'utf-8');

describe('MemoriaCalculo.astro — marcação acessível da memória (spec 025, contract C-4)', () => {
  it('usa <details>/<summary> nativo com o contêiner data-memoria por indicador (FR-001)', () => {
    expect(fonte).toContain('<details');
    expect(fonte).toContain('data-memoria={indicador.sigla}');
  });

  it('rótulo do controle em pt-BR, visível e estável (FR-001, FR-014)', () => {
    expect(fonte).toContain('Ver memória de cálculo');
  });

  it('tabela de variáveis com <caption> e cabeçalhos de escopo (FR-010)', () => {
    expect(fonte).toMatch(/<caption[\s\S]*?<\/caption>/);
    expect(fonte).toMatch(/th[^>]*scope="col"/);
  });

  it('declara os hooks estáticos da memória (contract C-3)', () => {
    expect(fonte).toContain('data-memoria-formula-declarada');
    expect(fonte).toContain('data-memoria-formula-substituida');
    expect(fonte).toContain('data-memoria-nota');
    expect(fonte).toContain('data-memoria-valor-final');
    expect(fonte).toContain('data-memoria-valor-final-unidade');
    expect(fonte).toContain('data-memoria-variavel-valor');
    expect(fonte).toContain('data-memoria-variavel-linha');
  });

  it('usa o badge canônico de indisponibilidade e renderiza valores sempre dinâmicos (Princípio III)', () => {
    expect(fonte).toContain('badge-indisponivel');
    // Nenhum valor é escrito à mão: célula e valor final vêm da memória canônica.
    expect(fonte).toContain('memoria.valorFinalFormatado');
    expect(fonte).toContain('variavel.valorFormatado');
  });

  it('texto acessível da fórmula substituída para leitores de tela (FR-010)', () => {
    expect(fonte).toContain('data-memoria-acessivel');
  });

  it('o <summary> não contém controles interativos aninhados', () => {
    const resumo = fonte.match(/<summary[\s\S]*?<\/summary>/)?.[0] ?? '';
    expect(resumo).not.toMatch(/<button|<a |<input|<details|<select/);
  });

  it('carrega recolhida por padrão — sem atributo open no markup (clarificação Q2, FR-012)', () => {
    expect(fonte).not.toMatch(/<details[^>]*\sopen[\s>]/);
  });
});
