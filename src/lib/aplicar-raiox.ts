/**
 * Aplicador DOM para o diálogo do Raio-X do Indicador (feature 026).
 *
 * Contrato: specs/026-raio-x-indicador/contracts/dom-raiox.md
 */

import {
  type FixtureRaiox,
  type ComponenteRaiox,
  construirResumo,
  filtrarRegistros,
  ordenarRegistros,
  paginarRegistros,
  formatarCabecalhoCampo,
  construirRodapeRaiox,
  gerarCsvRaiox,
} from './raiox';

export { formatarCabecalhoCampo };

export interface EstadoAbaRaiox {
  termoBusca: string;
  colunaOrdenacao: string | null;
  direcaoOrdenacao: 'asc' | 'desc';
  paginaAtual: number;
  porPagina: 25 | 50 | 100;
}

export interface EstadoRaiox {
  fixture: FixtureRaiox;
  simboloAbaAtiva: string;
  abas: Record<string, EstadoAbaRaiox>;
}

export function criarEstadoInicial(fixture: FixtureRaiox): EstadoRaiox {
  const primeiraAba = fixture.componentes[0]?.simbolo || '';
  const abas: Record<string, EstadoAbaRaiox> = {};

  for (const comp of fixture.componentes) {
    abas[comp.simbolo] = {
      termoBusca: '',
      colunaOrdenacao: comp.campos[0] || null,
      direcaoOrdenacao: 'asc',
      paginaAtual: 1,
      porPagina: 25,
    };
  }

  return {
    fixture,
    simboloAbaAtiva: primeiraAba,
    abas,
  };
}

export function formatarValorCelula(campo: string, valor: string | number | null): string {
  if (valor === null || valor === undefined || valor === '') {
    return 'Dado indisponível';
  }
  if (campo === 'valor' && typeof valor === 'number') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }
  return String(valor);
}

export interface ElementoRaioxAlvo {
  textContent?: string | null;
  innerHTML?: string;
  hidden?: boolean;
}

export function aplicarRaiox(
  doc: { querySelector: (s: string) => ElementoRaioxAlvo | Element | null },
  estado: EstadoRaiox,
  onAcao?: (tipo: string, payload: unknown) => void,
): void {
  // 1. Título
  const elTitulo = doc.querySelector('[data-raiox-titulo]');
  if (elTitulo) {
    elTitulo.textContent = `Raio-X do Indicador — ${estado.fixture.indicador} · ${estado.fixture.campusNome} · ${estado.fixture.ano}`;
  }

  // 2. Abas (Tablist)
  const elTablist = doc.querySelector('[data-raiox-tablist]');
  if (elTablist) {
    elTablist.innerHTML = estado.fixture.componentes
      .map((comp) => {
        const ativa = comp.simbolo === estado.simboloAbaAtiva;
        return `
          <button
            type="button"
            class="raiox-tab ${ativa ? 'raiox-tab-ativa' : ''}"
            role="tab"
            data-raiox-tab="${comp.simbolo}"
            aria-selected="${ativa ? 'true' : 'false'}"
            aria-controls="raiox-painel-${comp.simbolo}"
            id="raiox-tab-${comp.simbolo}"
          >
            ${comp.rotulo} (${comp.simbolo})
          </button>
        `;
      })
      .join('');
  }

  // 3. Painéis de Componente
  const elPaineis = doc.querySelector('[data-raiox-paineis]');
  if (elPaineis) {
    elPaineis.innerHTML = estado.fixture.componentes
      .map((comp) => {
        const ativa = comp.simbolo === estado.simboloAbaAtiva;
        const estadoAba = estado.abas[comp.simbolo] || {
          termoBusca: '',
          colunaOrdenacao: null,
          direcaoOrdenacao: 'asc',
          paginaAtual: 1,
          porPagina: 25,
        };
        const resumo = construirResumo(comp);

        const seloClasse = resumo.conferido
          ? 'raiox-selo-conferido'
          : resumo.divergencia
            ? 'raiox-selo-divergencia'
            : 'raiox-selo-aviso';

        if (!comp.detalhado) {
          return `
            <div
              class="raiox-painel"
              id="raiox-painel-${comp.simbolo}"
              role="tabpanel"
              data-raiox-panel="${comp.simbolo}"
              aria-labelledby="raiox-tab-${comp.simbolo}"
              ${ativa ? '' : 'hidden'}
            >
              <div class="raiox-painel-topo">
                <div class="raiox-selo ${seloClasse}" data-raiox-selo="${comp.simbolo}">
                  ${resumo.textoSelo}
                </div>
              </div>
              <p class="aviso-sem-linhas">
                Não há detalhamento de registros individuais disponível na fonte institucional para este componente.
              </p>
            </div>
          `;
        }

        const filtrados = filtrarRegistros(comp.registros, comp.campos, estadoAba.termoBusca);
        const ordenados = estadoAba.colunaOrdenacao
          ? ordenarRegistros(filtrados, estadoAba.colunaOrdenacao, estadoAba.direcaoOrdenacao)
          : filtrados;

        const { fatia, totalPaginas } = paginarRegistros(
          ordenados,
          estadoAba.paginaAtual,
          estadoAba.porPagina,
        );

        const cabecalhosHtml = comp.campos
          .map((campo) => {
            const estaOrdenado = estadoAba.colunaOrdenacao === campo;
            const seta = estaOrdenado ? (estadoAba.direcaoOrdenacao === 'asc' ? ' ▲' : ' ▼') : '';
            const ariaSort = estaOrdenado
              ? estadoAba.direcaoOrdenacao === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none';
            return `
              <th scope="col" data-raiox-coluna="${campo}" data-raiox-simbolo="${comp.simbolo}" aria-sort="${ariaSort}">
                ${formatarCabecalhoCampo(campo)}${seta}
              </th>
            `;
          })
          .join('');

        let linhasHtml = '';
        if (fatia.length === 0) {
          linhasHtml = `
            <tr>
              <td colspan="${comp.campos.length}" class="linha-vazia">
                Nenhum registro encontrado para o termo pesquisado.
              </td>
            </tr>
          `;
        } else {
          linhasHtml = fatia
            .map((reg) => {
              const colunas = comp.campos
                .map((campo) => {
                  const val = reg[campo];
                  const formatado = formatarValorCelula(campo, val);
                  const cls =
                    val === null || val === undefined ? ' class="celula-indisponivel"' : '';
                  return `<td${cls}>${formatado}</td>`;
                })
                .join('');
              return `<tr>${colunas}</tr>`;
            })
            .join('');
        }

        return `
          <div
            class="raiox-painel"
            id="raiox-painel-${comp.simbolo}"
            role="tabpanel"
            data-raiox-panel="${comp.simbolo}"
            aria-labelledby="raiox-tab-${comp.simbolo}"
            ${ativa ? '' : 'hidden'}
          >
            <div class="raiox-painel-topo">
              <div class="raiox-selo ${seloClasse}" data-raiox-selo="${comp.simbolo}">
                ${resumo.textoSelo}
              </div>
              <div class="raiox-controles">
                <input
                  type="search"
                  class="raiox-busca-input"
                  data-raiox-busca="${comp.simbolo}"
                  placeholder="Buscar por nome, projeto, curso..."
                  value="${estadoAba.termoBusca}"
                  aria-label="Buscar registros em ${comp.simbolo}"
                />
                <span class="raiox-contador" data-raiox-contador="${comp.simbolo}">
                  Exibindo ${filtrados.length} de ${comp.registros.length} registros
                </span>
              </div>
            </div>

            <div class="raiox-tabela-scroll">
              <table class="raiox-tabela">
                <thead>
                  <tr>${cabecalhosHtml}</tr>
                </thead>
                <tbody data-raiox-corpo="${comp.simbolo}">
                  ${linhasHtml}
                </tbody>
              </table>
            </div>

            <div class="raiox-paginacao">
              <span>Página ${estadoAba.paginaAtual} de ${totalPaginas}</span>
              <div class="nav-botoes-paginacao">
                <button
                  type="button"
                  data-raiox-paginar="${comp.simbolo}"
                  data-raiox-pagina-alvo="${estadoAba.paginaAtual - 1}"
                  ${estadoAba.paginaAtual <= 1 ? 'disabled' : ''}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  data-raiox-paginar="${comp.simbolo}"
                  data-raiox-pagina-alvo="${estadoAba.paginaAtual + 1}"
                  ${estadoAba.paginaAtual >= totalPaginas ? 'disabled' : ''}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // 4. Rodapé com Fórmula e Avaliação (FR-007)
  const elRodapeFormula = doc.querySelector('[data-raiox-rodape-formula]');
  if (elRodapeFormula) {
    const rodape = construirRodapeRaiox(estado.fixture.indicador, estado.fixture.componentes);
    let texto = `${estado.fixture.indicador}: ${rodape.formulaDeclarada} ⇒ ${rodape.formulaSubstituida}`;
    if (rodape.notaGovernanca) {
      texto += ` · ${rodape.notaGovernanca}`;
    }
    elRodapeFormula.textContent = texto;
  }

  // 6. Proveniência e Metadados (US3)
  const elProveniencia = doc.querySelector('[data-raiox-proveniencia]');
  if (elProveniencia) {
    const fontesNomes = estado.fixture.fontes.map((f) => f.arquivo).join(', ');
    elProveniencia.textContent = `Fontes: ${fontesNomes} · Gerado em: ${estado.fixture.geradoEm}`;
  }

  // Ligações de eventos delegados no navegador (se document e addEventListener existirem)
  if (typeof document !== 'undefined' && onAcao) {
    ligarEventosInterativos(doc, estado, onAcao);
  }
}

interface DocInterativo {
  querySelectorAll?: (s: string) => NodeListOf<Element> | Element[];
}

function ligarEventosInterativos(
  doc: DocInterativo,
  estado: EstadoRaiox,
  onAcao: (tipo: string, payload: unknown) => void,
): void {
  // Tabs
  const elTabs = doc.querySelectorAll?.('[data-raiox-tab]');
  elTabs?.forEach((node) => {
    const tab = node as HTMLElement;
    tab.onclick = () => {
      const simbolo = tab.getAttribute('data-raiox-tab');
      if (simbolo) onAcao('trocar-aba', simbolo);
    };
  });

  // Busca
  const inputsBusca = doc.querySelectorAll?.('[data-raiox-busca]');
  inputsBusca?.forEach((node) => {
    const input = node as HTMLInputElement;
    input.oninput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const simbolo = input.getAttribute('data-raiox-busca');
      onAcao('buscar', { simbolo, termo: target.value });
    };
  });

  // Ordenação
  const colunas = doc.querySelectorAll?.('[data-raiox-coluna]');
  colunas?.forEach((node) => {
    const th = node as HTMLElement;
    th.onclick = () => {
      const campo = th.getAttribute('data-raiox-coluna');
      const simbolo = th.getAttribute('data-raiox-simbolo');
      if (!campo || !simbolo) return;
      const estadoAba = estado.abas[simbolo];
      const novaDirecao =
        estadoAba && estadoAba.colunaOrdenacao === campo && estadoAba.direcaoOrdenacao === 'asc'
          ? 'desc'
          : 'asc';
      onAcao('ordenar', { simbolo, campo, direcao: novaDirecao });
    };
  });

  // Paginação
  const botoesPag = doc.querySelectorAll?.('[data-raiox-paginar]');
  botoesPag?.forEach((node) => {
    const btn = node as HTMLElement;
    btn.onclick = () => {
      const simbolo = btn.getAttribute('data-raiox-paginar');
      const alvo = parseInt(btn.getAttribute('data-raiox-pagina-alvo') || '1', 10);
      onAcao('paginar', { simbolo, pagina: alvo });
    };
  });
}

export function gerarCsvComponente(comp: ComponenteRaiox): string {
  return gerarCsvRaiox(comp.registros, comp.campos);
}
