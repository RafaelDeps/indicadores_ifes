import type { VisaoMemoria } from './memoria';
import { TEXTO_INDISPONIVEL } from './formatters';

/**
 * Aplica a visão da memória de cálculo (spec 025) ao DOM da página de pilar.
 *
 * Contrato C-2 (specs/025-pillar-calculation-audit/contracts/memoria-dom-ui.md):
 * - preenche os hooks `data-memoria-*` INDEPENDENTEMENTE do estado `open` do
 *   `<details>` — expandir depois de trocar contexto mostra valores já corretos;
 * - NUNCA altera `open`, `aria-expanded` ou foco: abrir/fechar é estado nativo
 *   do `<details>` (clarificação Q2 da spec);
 * - não toca hooks de outros blocos (`data-card-*`, `data-kpi-*`).
 */
export function aplicarMemoria(doc: Document, memorias: VisaoMemoria[]): void {
  for (const memoria of memorias) {
    const sigla = memoria.sigla;

    const elFinal = doc.querySelector(`[data-memoria-valor-final="${sigla}"]`);
    if (elFinal) {
      elFinal.textContent = memoria.valorFinalFormatado;
      if (!memoria.disponivel) {
        elFinal.classList.add('badge-indisponivel');
      } else {
        elFinal.classList.remove('badge-indisponivel');
      }
    }

    // `unidadeJaNoValor` evita repetir o sufixo que já está no valor ("6%"):
    // o span some e o "%" do valor faz papel de unidade (padrão dos cartões).
    const elUnidade = doc.querySelector(
      `[data-memoria-valor-final-unidade="${sigla}"]`,
    ) as HTMLElement | null;
    if (elUnidade) {
      const mostrarUnidade = memoria.disponivel && !!memoria.unidade && !memoria.unidadeJaNoValor;
      if (mostrarUnidade) {
        elUnidade.textContent = memoria.unidade ?? '';
        if (elUnidade.style) elUnidade.style.display = '';
      } else {
        elUnidade.textContent = '';
        if (elUnidade.style) elUnidade.style.display = 'none';
      }
    }

    const elFormula = doc.querySelector(`[data-memoria-formula-substituida="${sigla}"]`);
    if (elFormula) {
      elFormula.textContent = memoria.formulaSubstituida;
    }

    const elNota = doc.querySelector(`[data-memoria-nota="${sigla}"]`) as HTMLElement | null;
    if (elNota) {
      if (memoria.nota) {
        elNota.textContent = memoria.nota;
        if (elNota.style) elNota.style.display = '';
      } else {
        elNota.textContent = '';
        if (elNota.style) elNota.style.display = 'none';
      }
    }

    for (const variavel of memoria.variaveis) {
      const elValor = doc.querySelector(
        `[data-memoria-variavel-valor="${sigla}"][data-memoria-simbolo="${variavel.simbolo}"]`,
      );
      if (elValor) {
        elValor.textContent = variavel.valorFormatado;
        if (!variavel.disponivel) {
          elValor.classList.add('badge-indisponivel');
        } else {
          elValor.classList.remove('badge-indisponivel');
        }
      }

      const elLinha = doc.querySelector(
        `[data-memoria-variavel-linha="${sigla}"][data-memoria-simbolo="${variavel.simbolo}"]`,
      );
      if (elLinha) {
        if (!variavel.disponivel) {
          elLinha.setAttribute('data-memoria-indisponivel', 'true');
        } else {
          elLinha.removeAttribute('data-memoria-indisponivel');
        }
      }
    }

    // Histórico multi-anual (US2): trocar de campus pode mudar os anos
    // disponíveis, então cabeçalho e corpo são recriados a cada sincronização
    // (mesmo padrão de `aplicarVisaoHistorico`). Ano ativo marcado com
    // `aria-current` — o destaque visual nunca é o único sinal.
    if (memoria.historico && memoria.historico.anos.length > 0) {
      const elAnos = doc.querySelector(`[data-memoria-hist-anos="${sigla}"]`);
      if (elAnos) {
        elAnos.innerHTML =
          '<th scope="col">Variável</th>' +
          memoria.historico.anos
            .map(
              (ano) =>
                `<th scope="col" data-memoria-hist-ano="${ano}"${
                  ano === memoria.historico.anoAtivo ? ' aria-current="true"' : ''
                }>${ano}</th>`,
            )
            .join('');
      }

      const elCorpo = doc.querySelector(`[data-memoria-historico-corpo="${sigla}"]`);
      if (elCorpo) {
        elCorpo.innerHTML = memoria.historico.linhas
          .map(
            (linha) =>
              `<tr data-memoria-hist-linha="${linha.simbolo}"><th scope="row"><code>${linha.simbolo}</code></th>` +
              memoria.historico.anos
                .map((ano) => {
                  const valor = linha.valoresPorAno[ano] ?? TEXTO_INDISPONIVEL;
                  const classe = valor === TEXTO_INDISPONIVEL ? ' class="badge-indisponivel"' : '';
                  return `<td data-memoria-hist-valor="${sigla}" data-memoria-simbolo="${linha.simbolo}" data-memoria-ano="${ano}"${classe}>${valor}</td>`;
                })
                .join('') +
              '</tr>',
          )
          .join('');
      }
    }
  }
}
