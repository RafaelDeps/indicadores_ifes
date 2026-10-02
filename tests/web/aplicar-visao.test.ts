import { describe, expect, it } from 'vitest';
import { aplicarVisaoGeral, aplicarVisaoDetalhe } from '../../src/lib/aplicar-visao';
import type { VisaoPaginaGeral, VisaoPaginaDetalhe } from '../../src/lib/visao';

// Mock simples de elemento DOM para testes em ambiente Node puro
class ElementoMock {
  textContent: string = '';
  attributes: Record<string, string> = {};
  classList = {
    classes: new Set<string>(),
    add: (c: string) => this.classList.classes.add(c),
    remove: (c: string) => this.classList.classes.delete(c),
    contains: (c: string) => this.classList.classes.has(c),
  };

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
}

class DocumentMock {
  elementos: Map<string, ElementoMock> = new Map();

  registrar(seletor: string, el: ElementoMock) {
    this.elementos.set(seletor, el);
  }

  querySelector(seletor: string): ElementoMock | null {
    return this.elementos.get(seletor) ?? null;
  }

  querySelectorAll(seletor: string): ElementoMock[] {
    const res: ElementoMock[] = [];
    for (const [key, el] of this.elementos.entries()) {
      if (key.includes(seletor) || seletor === key) {
        res.push(el);
      }
    }
    return res;
  }
}

describe('aplicar-visao (atualização do DOM)', () => {
  it('atualiza valores de KPI na visão geral sem falhar em nós ausentes', () => {
    const doc = new DocumentMock();
    const ntppValorEl = new ElementoMock();
    const ntppUnidadeEl = new ElementoMock();
    doc.registrar('[data-kpi-valor="NTPP"]', ntppValorEl);
    doc.registrar('[data-kpi-unidade="NTPP"]', ntppUnidadeEl);

    const visaoMock: VisaoPaginaGeral = {
      contexto: { campus: 'serra', ano: 2024 },
      kpis: {
        NTPP: {
          sigla: 'NTPP',
          valorFormatado: '10',
          unidade: 'projetos',
          disponivel: true,
        },
      },
      pilares: { 1: [], 2: [], 3: [] },
    };

    aplicarVisaoGeral(doc as unknown as Document, visaoMock);

    expect(ntppValorEl.textContent).toBe('10');
    expect(ntppUnidadeEl.textContent).toBe('projetos');
  });

  it('exibe badge de indisponível quando dado for nulo', () => {
    const doc = new DocumentMock();
    const ntppValorEl = new ElementoMock();
    doc.registrar('[data-kpi-valor="NTPP"]', ntppValorEl);

    const visaoMock: VisaoPaginaGeral = {
      contexto: { campus: 'vitoria', ano: 2024 },
      kpis: {
        NTPP: {
          sigla: 'NTPP',
          valorFormatado: 'Dado indisponível',
          disponivel: false,
        },
      },
      pilares: { 1: [], 2: [], 3: [] },
    };

    aplicarVisaoGeral(doc as unknown as Document, visaoMock);

    expect(ntppValorEl.textContent).toBe('Dado indisponível');
  });

  it('atualiza os dados de detalhe e componentes da fórmula', () => {
    const doc = new DocumentMock();
    const rotuloAnoEl = new ElementoMock();
    const valorPrincipalEl = new ElementoMock();
    const compNepEl = new ElementoMock();

    doc.registrar('[data-detalhe-ano-rotulo]', rotuloAnoEl);
    doc.registrar('[data-detalhe-valor]', valorPrincipalEl);
    doc.registrar('[data-componente-qtd="NEP"]', compNepEl);

    const visaoDetalheMock: VisaoPaginaDetalhe = {
      sigla: 'PIES',
      contexto: { campus: 'serra', ano: 2025 },
      metricaPrincipal: {
        sigla: 'PIES',
        valorFormatado: '6%',
        disponivel: true,
      },
      componentes: [{ sigla: 'NEP', nome: 'Estudantes em Pesquisa', quantidadeFormatada: '60' }],
    };

    aplicarVisaoDetalhe(doc as unknown as Document, visaoDetalheMock);

    expect(rotuloAnoEl.textContent).toContain('2025');
    expect(valorPrincipalEl.textContent).toBe('6%');
    expect(compNepEl.textContent).toBe('60');
  });
});
