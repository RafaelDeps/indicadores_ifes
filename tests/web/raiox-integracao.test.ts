import { describe, it, expect, beforeEach } from 'vitest';
import { aplicarRaiox, criarEstadoInicial, gerarCsvComponente } from '../../src/lib/aplicar-raiox';
import { fixtureRaiox, componenteNep } from './fixtures/raiox-fixture';

class MockElement {
  textContent = '';
  innerHTML = '';
  hidden = false;
  attributes: Record<string, string> = {};
  onclick: ((e: unknown) => void) | null = null;
  oninput: ((e: unknown) => void) | null = null;

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
}

class MockDocument {
  elementos = new Map<string, MockElement>();

  registrar(seletor: string) {
    const el = new MockElement();
    this.elementos.set(seletor, el);
    return el;
  }

  querySelector(seletor: string) {
    return this.elementos.get(seletor) ?? null;
  }

  querySelectorAll(_seletor: string) {
    return [];
  }
}

describe('raiox-integracao: aplicação DOM da fixture de auditoria (T011, T018 e T022)', () => {
  let doc: MockDocument;
  let elTitulo: MockElement;
  let elTablist: MockElement;
  let elPaineis: MockElement;
  let elProveniencia: MockElement;
  let elRodapeFormula: MockElement;

  beforeEach(() => {
    doc = new MockDocument();
    elTitulo = doc.registrar('[data-raiox-titulo]');
    elTablist = doc.registrar('[data-raiox-tablist]');
    elPaineis = doc.registrar('[data-raiox-paineis]');
    elProveniencia = doc.registrar('[data-raiox-proveniencia]');
    elRodapeFormula = doc.registrar('[data-raiox-rodape-formula]');
  });

  it('aplica dados da fixture no DOM mockado', () => {
    const estado = criarEstadoInicial(fixtureRaiox);
    aplicarRaiox(doc, estado);

    // Título atualizado
    expect(elTitulo.textContent).toContain('PIES');
    expect(elTitulo.textContent).toContain('2025');

    // Abas criadas
    expect(elTablist.innerHTML).toContain('data-raiox-tab="NEP"');
    expect(elTablist.innerHTML).toContain('data-raiox-tab="NTE"');

    // Painéis e tabelas criados
    expect(elPaineis.innerHTML).toContain('data-raiox-selo="NEP"');
    expect(elPaineis.innerHTML).toContain('✓ (Conferido)');
    expect(elPaineis.innerHTML).toContain('Ana Souza');
    expect(elPaineis.innerHTML).toContain('Projeto Álgebra Aplicada');

    // Proveniência
    expect(elProveniencia.textContent).toContain('exports_canonical.zip');
    expect(elProveniencia.textContent).toContain('2026-10-15');

    // Rodapé de fórmula com substituição (FR-007)
    expect(elRodapeFormula.textContent).toContain('PIES');
    expect(elRodapeFormula.textContent).toContain('(3 / 2) × 100');
  });

  it('trata ação de busca atualizando estado e filtrando registros', () => {
    const estado = criarEstadoInicial(fixtureRaiox);
    estado.abas['NEP'].termoBusca = 'Bruno';

    aplicarRaiox(doc, estado);

    expect(elPaineis.innerHTML).toContain('Exibindo 1 de 3 registros');
    expect(elPaineis.innerHTML).toContain('Bruno Lima');
    expect(elPaineis.innerHTML).not.toContain('Ana Souza');
  });

  it('gera CSV de exportação com delimitadores e campos corretos', () => {
    const csv = gerarCsvComponente(componenteNep);
    expect(csv).toContain('Nome,Projeto,Vínculo / Papel,Matrícula,Curso');
    expect(csv).toContain('"Ana Souza"');
    expect(csv).toContain('"Projeto Álgebra Aplicada"');
  });
});
