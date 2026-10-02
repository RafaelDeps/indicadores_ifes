import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import IndicatorCard from '../../src/components/IndicatorCard.astro';
import type { Indicador } from '../../src/data/indicadores';
import { aplicarVisaoPilar } from '../../src/lib/aplicar-visao';
import { criarElementoMock } from './fixtures/detalhe-fixtures';

const INDICADOR_BASE: Indicador = {
  sigla: 'TESTE',
  slug: 'teste',
  nome: 'Indicador Teste',
  oQueMede: 'Mede para teste',
  finalidade: 'Acessibilidade',
  formula: 'A / B',
  icone: 'academic',
  pilarNumero: 1,
  polaridade: 'maior_melhor',
  variaveis: [],
  valores: [],
};

async function renderizarCard(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(IndicatorCard, { props });
}

describe('Acessibilidade de Deltas e WCAG AA (User Story 3)', () => {
  it('renderiza delta positivo com símbolo ▲ e aria-label descritivo', async () => {
    const indicador: Indicador = {
      ...INDICADOR_BASE,
      valores: [
        { ano: 2025, campus: 'serra', valor: 100 },
        { ano: 2026, campus: 'serra', valor: 120 },
      ],
    };
    const html = await renderizarCard({ indicador, ano: 2026, campus: 'serra' });

    expect(html).toContain('▲');
    expect(html).toContain('+20,0%');
    expect(html).toMatch(/aria-label="Aumento de 20,0% em relação a 2025"/i);
  });

  it('renderiza delta negativo com símbolo ▼ e aria-label descritivo', async () => {
    const indicador: Indicador = {
      ...INDICADOR_BASE,
      valores: [
        { ano: 2025, campus: 'serra', valor: 100 },
        { ano: 2026, campus: 'serra', valor: 80 },
      ],
    };
    const html = await renderizarCard({ indicador, ano: 2026, campus: 'serra' });

    expect(html).toContain('▼');
    expect(html).toContain('-20,0%');
    expect(html).toMatch(/aria-label="Redução de 20,0% em relação a 2025"/i);
  });

  it('renderiza delta neutro com símbolo = e aria-label descritivo', async () => {
    const indicador: Indicador = {
      ...INDICADOR_BASE,
      valores: [
        { ano: 2025, campus: 'serra', valor: 100 },
        { ano: 2026, campus: 'serra', valor: 100 },
      ],
    };
    const html = await renderizarCard({ indicador, ano: 2026, campus: 'serra' });

    expect(html).toMatch(/aria-label="Sem alteração percentual em relação a 2025"/i);
  });

  it('renderiza delta sem base com aria-label de sem base anterior', async () => {
    const indicador: Indicador = {
      ...INDICADOR_BASE,
      valores: [{ ano: 2026, campus: 'serra', valor: 100 }],
    };
    const html = await renderizarCard({ indicador, ano: 2026, campus: 'serra' });

    expect(html).toContain('Sem base anterior');
    expect(html).toMatch(/aria-label="Sem base de comparação anterior"/i);
  });

  it('BaseLayout possui skip link e âncora de conteúdo principal para navegação por teclado', () => {
    const conteudo = readFileSync('src/layouts/BaseLayout.astro', 'utf-8');
    expect(conteudo).toMatch(/href="#conteudo-principal"/);
    expect(conteudo).toContain('Pular para o conteúdo principal');
    expect(conteudo).toMatch(/<main\b[^>]*id="conteudo-principal"/);
  });

  it('IndicadorDetalhe possui wrapper com rolagem horizontal acessível e semântica para tabelas', () => {
    const conteudo = readFileSync('src/components/IndicadorDetalhe.astro', 'utf-8');
    expect(conteudo).toContain('tabela-scroll-wrapper');
    expect(conteudo).toContain('role="region"');
    expect(conteudo).toContain('tabindex="0"');
    expect(conteudo).toMatch(/aria-label="[^"]*tabela[^"]*"/i);
  });

  it('aplicarVisaoPilar atualiza atributos aria-label e texto do delta dinamicamente', () => {
    const elCard = criarElementoMock('div', { class: 'cartao-indicador' });
    const elDeltaContainer = criarElementoMock('div', {
      class: 'cartao-delta delta-sem_base',
      'aria-label': 'Sem base de comparação anterior',
    });
    const elDeltaRotulo = criarElementoMock('span', {
      class: 'delta-rotulo',
      'data-card-delta': 'NTPP',
    });
    elDeltaRotulo.textContent = 'Sem base anterior';
    elDeltaContainer.appendChild(elDeltaRotulo);
    elCard.appendChild(elDeltaContainer);

    const docMock = {
      querySelector: (seletor: string) => {
        if (seletor === '[data-card-delta="NTPP"]') return elDeltaRotulo;
        return null;
      },
    } as unknown as Document;

    aplicarVisaoPilar(docMock, [
      {
        sigla: 'NTPP',
        valorFormatado: '150',
        disponivel: true,
        deltaFormatado: '▲ +25,0%',
        deltaPositivo: true,
        deltaAcessivel: 'Aumento de 25,0% em relação a 2024',
      },
    ]);

    expect(elDeltaRotulo.textContent).toBe('▲ +25,0%');
    expect(elDeltaContainer.getAttribute('aria-label')).toBe('Aumento de 25,0% em relação a 2024');
    expect(elDeltaContainer.classList.contains('positivo')).toBe(true);
  });
});
