import { describe, expect, it } from 'vitest';
import {
  aplicarVisaoDetalhe,
  aplicarVisaoGeral,
  aplicarVisaoPilar,
} from '../../src/lib/aplicar-visao';
import type { VisaoMetrica, VisaoPaginaGeral, VisaoPaginaDetalhe } from '../../src/lib/visao';

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

  // `visao.ts` suffixa o próprio valor com `%` para indicadores de percentual,
  // enquanto o card e o banner de detalhe têm um `<span>` de unidade irmão. Se
  // os dois forem preenchidos, o usuário lê "23%%". Este par de testes fixa a
  // regra: o sufixo fica OU no valor OU no span de unidade, nunca nos dois.
  it('não duplica o sufixo % no card de um indicador percentual', () => {
    const doc = new DocumentMock();
    const valorEl = new ElementoMock();
    const unidadeEl = new ElementoMock();
    doc.registrar('[data-card-valor="PIES"]', valorEl);
    doc.registrar('[data-card-unidade="PIES"]', unidadeEl);

    const metrica: VisaoMetrica = {
      sigla: 'PIES',
      valorFormatado: '23%',
      unidade: '%',
      unidadeJaNoValor: true,
      disponivel: true,
    };

    aplicarVisaoPilar(doc as unknown as Document, [metrica]);

    expect(valorEl.textContent).toBe('23%');
    expect(unidadeEl.textContent).toBe('');
  });

  it('não duplica o sufixo % no banner de detalhe de um indicador percentual', () => {
    const doc = new DocumentMock();
    const valorEl = new ElementoMock();
    const unidadeEl = new ElementoMock();
    doc.registrar('[data-detalhe-valor]', valorEl);
    doc.registrar('[data-detalhe-unidade]', unidadeEl);

    const visaoDetalheMock: VisaoPaginaDetalhe = {
      sigla: 'PICOT',
      contexto: { campus: 'serra', ano: 2025 },
      metricaPrincipal: {
        sigla: 'PICOT',
        valorFormatado: '22%',
        unidade: '%',
        unidadeJaNoValor: true,
        disponivel: true,
      },
      componentes: [],
    };

    aplicarVisaoDetalhe(doc as unknown as Document, visaoDetalheMock);

    expect(valorEl.textContent).toBe('22%');
    expect(unidadeEl.textContent).toBe('');
  });

  it('mantém a unidade no span quando o valor não é percentual', () => {
    const doc = new DocumentMock();
    const valorEl = new ElementoMock();
    const unidadeEl = new ElementoMock();
    doc.registrar('[data-card-valor="NTPP"]', valorEl);
    doc.registrar('[data-card-unidade="NTPP"]', unidadeEl);

    const metrica: VisaoMetrica = {
      sigla: 'NTPP',
      valorFormatado: '372',
      unidade: 'projetos',
      disponivel: true,
    };

    aplicarVisaoPilar(doc as unknown as Document, [metrica]);

    expect(valorEl.textContent).toBe('372');
    expect(unidadeEl.textContent).toBe('projetos');
  });
});
