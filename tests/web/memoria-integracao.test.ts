import { afterEach, describe, expect, it } from 'vitest';
import { sincronizarTela } from '../../src/lib/contexto-cliente';
import { datasetMemoria } from './fixtures/dataset-memoria';

class ElementoMock {
  textContent: string = '';
  innerHTML: string = '';
  style: Record<string, string> = {};
  attributes: Record<string, string> = {};
  classList = {
    classes: new Set<string>(),
    add: (c: string) => this.classList.classes.add(c),
    remove: (c: string) => this.classList.classes.delete(c),
    contains: (c: string) => this.classList.classes.has(c),
  };

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  removeAttribute(name: string): void {
    delete this.attributes[name];
  }
}

/**
 * Ambiente mínimo de página de pilar: script `#dados-indicadores` com o dataset
 * sintético, contêiner `[data-memoria]` e os hooks da memória do PIES. Sem
 * cartões/KPI/detalhe — o ramo da memória em `sincronizarTela` é independente.
 */
function criarAmbiente(query: string) {
  const elementos = new Map<string, ElementoMock>();
  const registrar = (seletor: string): ElementoMock => {
    const el = new ElementoMock();
    elementos.set(seletor, el);
    return el;
  };

  const hooks = {
    valorFinal: registrar('[data-memoria-valor-final="PIES"]'),
    unidade: registrar('[data-memoria-valor-final-unidade="PIES"]'),
    formula: registrar('[data-memoria-formula-substituida="PIES"]'),
    nota: registrar('[data-memoria-nota="PIES"]'),
    nep: registrar('[data-memoria-variavel-valor="PIES"][data-memoria-simbolo="NEP"]'),
    nte: registrar('[data-memoria-variavel-valor="PIES"][data-memoria-simbolo="NTE"]'),
  };

  const scriptDados = new ElementoMock();
  scriptDados.textContent = JSON.stringify(datasetMemoria);

  const containerMemoria = new ElementoMock();

  const documento = {
    getElementById(id: string) {
      return id === 'dados-indicadores' ? scriptDados : null;
    },
    querySelector(seletor: string) {
      if (seletor === '[data-memoria]') return containerMemoria;
      if (['[data-kpi-valor]', '[data-card-valor]', '[data-detalhe-sigla]'].includes(seletor)) {
        return null;
      }
      return elementos.get(seletor) ?? null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
  };

  (globalThis as Record<string, unknown>).window = {
    location: {
      pathname: '/pilar-1/',
      search: query,
      href: `https://teste.local/pilar-1/${query}`,
    },
    history: { replaceState() {}, pushState() {} },
    addEventListener() {},
  };
  (globalThis as Record<string, unknown>).document = documento;

  return { hooks, containerMemoria };
}

describe('sincronizarTela — integração da memória de cálculo na página do pilar (spec 025, FR-005)', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
  });

  it('preenche a memória com os valores do contexto da URL (?campus=serra&ano=2024)', () => {
    const { hooks } = criarAmbiente('?campus=serra&ano=2024');

    sincronizarTela();

    expect(hooks.valorFinal.textContent).toBe('5,5%');
    expect(hooks.nep.textContent).toBe('50');
    expect(hooks.nte.textContent).toBe('900');
    expect(hooks.formula.textContent).toBe('(50 / 900) × 100');
    expect(hooks.nota.textContent).toBe('');
  });

  it('atualiza a memória ao trocar o ano pela URL (?ano=2025), sem recarregar', () => {
    const { hooks } = criarAmbiente('?campus=serra&ano=2025');

    sincronizarTela();

    expect(hooks.valorFinal.textContent).toBe('6%');
    expect(hooks.nep.textContent).toBe('60');
    expect(hooks.nte.textContent).toBe('1.000');
    expect(hooks.formula.textContent).toBe('(60 / 1.000) × 100');
  });

  it('reflete o campus selecionado (?campus=litoral&ano=2025)', () => {
    const { hooks } = criarAmbiente('?campus=litoral&ano=2025');

    sincronizarTela();

    expect(hooks.valorFinal.textContent).toBe('4%');
    expect(hooks.nep.textContent).toBe('30');
    expect(hooks.formula.textContent).toBe('(30 / 750) × 100');
  });

  it('exibe a nota quando o contexto não permite reconstruir a avaliação (?ano=2026)', () => {
    const { hooks } = criarAmbiente('?campus=serra&ano=2026');

    sincronizarTela();

    expect(hooks.valorFinal.textContent).toBe('7%');
    expect(hooks.nep.textContent).toBe('Dado indisponível');
    expect(hooks.nota.textContent).not.toBe('');
  });

  it('não altera o estado aberto/fechado do <details> durante a sincronização', () => {
    const { containerMemoria } = criarAmbiente('?campus=serra&ano=2024');
    containerMemoria.attributes['open'] = 'open';

    sincronizarTela();

    expect(containerMemoria.getAttribute('open')).toBe('open');
  });
});
