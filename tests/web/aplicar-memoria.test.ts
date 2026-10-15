import { describe, expect, it } from 'vitest';
import { aplicarMemoria } from '../../src/lib/aplicar-memoria';
import type { VisaoMemoria } from '../../src/lib/memoria';

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

class DocumentMock {
  elementos = new Map<string, ElementoMock>();
  consultas: string[] = [];

  registrar(seletor: string): ElementoMock {
    const el = new ElementoMock();
    this.elementos.set(seletor, el);
    return el;
  }

  querySelector(seletor: string): ElementoMock | null {
    this.consultas.push(seletor);
    return this.elementos.get(seletor) ?? null;
  }

  querySelectorAll(): ElementoMock[] {
    return [];
  }
}

function memoriaFake(sobrescrever: Partial<VisaoMemoria> = {}): VisaoMemoria {
  return {
    sigla: 'PIES',
    slug: 'pies',
    pilarNumero: 1,
    contexto: { campus: 'serra', ano: 2025 },
    variaveis: [
      {
        simbolo: 'NEP',
        nome: 'Número de estudantes envolvidos em projetos de pesquisa',
        unidade: 'Estudantes',
        valorFormatado: '60',
        disponivel: true,
      },
      {
        simbolo: 'NTE',
        nome: 'Número total de estudantes matriculados',
        unidade: 'Estudantes',
        valorFormatado: '1.000',
        disponivel: true,
      },
    ],
    formulaDeclarada: 'PIES = (NEP / NTE) × 100',
    formulaSubstituida: '(60 / 1.000) × 100',
    formulaSubstituidaAcessivel: 'PIES é igual a 60 dividido por 1.000, multiplicado por 100',
    valorFinalFormatado: '6%',
    unidade: '%',
    unidadeJaNoValor: true,
    disponivel: true,
    historico: {
      anos: [2024, 2025],
      anoAtivo: 2025,
      linhas: [
        { simbolo: 'NEP', valoresPorAno: { 2024: '50', 2025: '60' } },
        { simbolo: 'NTE', valoresPorAno: { 2024: '900', 2025: '1.000' } },
      ],
    },
    ...sobrescrever,
  };
}

describe('aplicarMemoria — hooks da memória de cálculo (spec 025, contract C-2/C-3)', () => {
  it('preenche o valor final e oculta a unidade quando ela já está no valor (anti "6%%")', () => {
    const doc = new DocumentMock();
    const elFinal = doc.registrar('[data-memoria-valor-final="PIES"]');
    const elUnidade = doc.registrar('[data-memoria-valor-final-unidade="PIES"]');

    aplicarMemoria(doc as unknown as Document, [memoriaFake()]);

    expect(elFinal.textContent).toBe('6%');
    expect(elFinal.classList.contains('badge-indisponivel')).toBe(false);
    expect(elUnidade.style.display).toBe('none');
  });

  it('exibe a unidade quando o valor não a carrega', () => {
    const doc = new DocumentMock();
    const elFinal = doc.registrar('[data-memoria-valor-final="NTPP"]');
    const elUnidade = doc.registrar('[data-memoria-valor-final-unidade="NTPP"]');

    aplicarMemoria(doc as unknown as Document, [
      memoriaFake({
        sigla: 'NTPP',
        valorFinalFormatado: '10',
        unidade: 'Projetos',
        unidadeJaNoValor: false,
      }),
    ]);

    expect(elFinal.textContent).toBe('10');
    expect(elUnidade.textContent).toBe('Projetos');
    expect(elUnidade.style.display).not.toBe('none');
  });

  it('marca o valor final indisponível com badge e texto canônico (Princípio III)', () => {
    const doc = new DocumentMock();
    const elFinal = doc.registrar('[data-memoria-valor-final="PIES"]');

    aplicarMemoria(doc as unknown as Document, [
      memoriaFake({ disponivel: false, valorFinalFormatado: 'Dado indisponível' }),
    ]);

    expect(elFinal.textContent).toBe('Dado indisponível');
    expect(elFinal.classList.contains('badge-indisponivel')).toBe(true);
  });

  it('preenche a fórmula substituída e os valores de cada variável', () => {
    const doc = new DocumentMock();
    const elFormula = doc.registrar('[data-memoria-formula-substituida="PIES"]');
    const elNep = doc.registrar('[data-memoria-variavel-valor="PIES"][data-memoria-simbolo="NEP"]');
    const elNte = doc.registrar('[data-memoria-variavel-valor="PIES"][data-memoria-simbolo="NTE"]');
    const linhaNep = doc.registrar(
      '[data-memoria-variavel-linha="PIES"][data-memoria-simbolo="NEP"]',
    );
    const linhaNte = doc.registrar(
      '[data-memoria-variavel-linha="PIES"][data-memoria-simbolo="NTE"]',
    );

    aplicarMemoria(doc as unknown as Document, [memoriaFake()]);

    expect(elFormula.textContent).toBe('(60 / 1.000) × 100');
    expect(elNep.textContent).toBe('60');
    expect(elNte.textContent).toBe('1.000');
    expect(linhaNep.getAttribute('data-memoria-indisponivel')).toBeNull();
    expect(linhaNte.getAttribute('data-memoria-indisponivel')).toBeNull();
  });

  it('marca a linha e o valor da variável indisponível, com texto canônico (Princípio III)', () => {
    const doc = new DocumentMock();
    const elNep = doc.registrar('[data-memoria-variavel-valor="PIES"][data-memoria-simbolo="NEP"]');
    const linhaNep = doc.registrar(
      '[data-memoria-variavel-linha="PIES"][data-memoria-simbolo="NEP"]',
    );

    aplicarMemoria(doc as unknown as Document, [
      memoriaFake({
        variaveis: [
          {
            simbolo: 'NEP',
            nome: 'Número de estudantes envolvidos em projetos de pesquisa',
            unidade: 'Estudantes',
            valorFormatado: 'Dado indisponível',
            disponivel: false,
          },
        ],
        formulaSubstituida: '(Dado indisponível / 1.000) × 100',
        nota: 'A avaliação não pôde ser reconstruída.',
      }),
    ]);

    expect(elNep.textContent).toBe('Dado indisponível');
    expect(elNep.classList.contains('badge-indisponivel')).toBe(true);
    expect(linhaNep.getAttribute('data-memoria-indisponivel')).toBe('true');
  });

  it('exibe a nota apenas quando a avaliação não pôde ser reconstruída', () => {
    const docComNota = new DocumentMock();
    const elNota = docComNota.registrar('[data-memoria-nota="PIES"]');
    aplicarMemoria(docComNota as unknown as Document, [
      memoriaFake({ nota: 'A avaliação não pôde ser reconstruída.' }),
    ]);
    expect(elNota.textContent).toBe('A avaliação não pôde ser reconstruída.');
    expect(elNota.style.display).not.toBe('none');

    const docSemNota = new DocumentMock();
    const elNotaVazia = docSemNota.registrar('[data-memoria-nota="PIES"]');
    aplicarMemoria(docSemNota as unknown as Document, [memoriaFake()]);
    expect(elNotaVazia.textContent).toBe('');
    expect(elNotaVazia.style.display).toBe('none');
  });

  it('não altera o estado aberto/fechado nem o contêiner do <details>', () => {
    const doc = new DocumentMock();
    const container = doc.registrar('[data-memoria="PIES"]');
    container.attributes['open'] = 'open';

    aplicarMemoria(doc as unknown as Document, [memoriaFake()]);

    expect(container.getAttribute('open')).toBe('open');
    const tocouContainer = doc.consultas.some(
      (consulta) => consulta === '[data-memoria="PIES"]' || consulta.includes('aria-expanded'),
    );
    expect(tocouContainer).toBe(false);
  });

  it('aplica múltiplas memórias sem interferência entre indicadores', () => {
    const doc = new DocumentMock();
    const elPies = doc.registrar('[data-memoria-valor-final="PIES"]');
    const elNtpp = doc.registrar('[data-memoria-valor-final="NTPP"]');

    aplicarMemoria(doc as unknown as Document, [
      memoriaFake(),
      memoriaFake({ sigla: 'NTPP', valorFinalFormatado: '15', unidade: 'Projetos' }),
    ]);

    expect(elPies.textContent).toBe('6%');
    expect(elNtpp.textContent).toBe('15');
  });

  it('não lança quando um hook não existe no DOM (memória de outro pilar)', () => {
    const doc = new DocumentMock();
    expect(() => aplicarMemoria(doc as unknown as Document, [memoriaFake()])).not.toThrow();
  });
});

describe('aplicarMemoria — reconstrução do histórico multi-anual (spec 025, US2)', () => {
  const historico: VisaoMemoria['historico'] = {
    anos: [2024, 2025, 2026],
    anoAtivo: 2025,
    linhas: [
      {
        simbolo: 'NEP',
        valoresPorAno: { 2024: '50', 2025: '60', 2026: 'Dado indisponível' },
      },
      {
        simbolo: 'NTE',
        valoresPorAno: { 2024: '900', 2025: '1.000', 2026: '1.000' },
      },
    ],
  };

  it('reconstrói o cabeçalho de anos com aria-current no ano ativo', () => {
    const doc = new DocumentMock();
    const elAnos = doc.registrar('[data-memoria-hist-anos="PIES"]');

    aplicarMemoria(doc as unknown as Document, [memoriaFake({ historico })]);

    expect(elAnos.innerHTML).toContain('<th scope="col">Variável</th>');
    expect(elAnos.innerHTML).toContain('data-memoria-hist-ano="2024"');
    expect(elAnos.innerHTML).toContain('data-memoria-hist-ano="2026"');
    const thAtivo = elAnos.innerHTML
      .split('<th')
      .find((parte) => parte.includes('2025') && parte.includes('aria-current'));
    expect(thAtivo).toBeTruthy();
    const thInativo = elAnos.innerHTML.split('<th').find((parte) => parte.includes('2024'));
    expect(thInativo).not.toContain('aria-current');
  });

  it('reconstrói o corpo com uma célula por variável × ano, com hooks completos', () => {
    const doc = new DocumentMock();
    const elCorpo = doc.registrar('[data-memoria-historico-corpo="PIES"]');

    aplicarMemoria(doc as unknown as Document, [memoriaFake({ historico })]);

    expect(elCorpo.innerHTML).toContain('data-memoria-hist-valor="PIES"');
    expect(elCorpo.innerHTML).toContain('data-memoria-simbolo="NEP"');
    expect(elCorpo.innerHTML).toContain('data-memoria-ano="2024"');
    expect(elCorpo.innerHTML).toContain('>50</td>');
    expect(elCorpo.innerHTML).toContain('>60</td>');
    expect(elCorpo.innerHTML).toContain('>Dado indisponível</td>');
    expect(elCorpo.innerHTML).toContain('<th scope="row"><code>NEP</code></th>');
  });

  it('não toca os hooks do histórico quando não há histórico definido', () => {
    const doc = new DocumentMock();
    const elAnos = doc.registrar('[data-memoria-hist-anos="PIES"]');
    const elCorpo = doc.registrar('[data-memoria-historico-corpo="PIES"]');

    aplicarMemoria(doc as unknown as Document, [
      memoriaFake({ historico: { anos: [], anoAtivo: 2025, linhas: [] } }),
    ]);

    expect(elAnos.innerHTML).toBe('');
    expect(elCorpo.innerHTML).toBe('');
  });
});
