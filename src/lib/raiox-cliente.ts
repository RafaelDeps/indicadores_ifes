/**
 * Controlador de eventos no cliente para o Raio-X do Indicador (feature 026).
 *
 * Contrato: specs/026-raio-x-indicador/contracts/dom-raiox.md §F
 */

import {
  buscarFixture,
  type FixtureRaiox,
  filtrarRegistros,
  ordenarRegistros,
  gerarCsvRaiox,
} from './raiox';
import { aplicarRaiox, criarEstadoInicial, type EstadoRaiox } from './aplicar-raiox';

let estadoAtual: EstadoRaiox | null = null;
let gatilhoDisparador: HTMLElement | null = null;
let siglaAtiva: string | null = null;
let callbackRecarregar: (() => void) | null = null;

export function recarregarRaioxSeAberto(): void {
  if (callbackRecarregar) {
    callbackRecarregar();
  }
}

export function inicializarRaiox(doc: Document = document): void {
  const dialog = doc.querySelector<HTMLDialogElement>('[data-raiox-dialog]');
  const overlay = doc.querySelector<HTMLElement>('[data-raiox-overlay]');
  if (!dialog || !overlay) {
    return;
  }

  const btnFechar = dialog.querySelector<HTMLButtonElement>('[data-raiox-fechar]');
  const btnExportar = dialog.querySelector<HTMLButtonElement>('[data-raiox-exportar]');
  const elStatus = dialog.querySelector<HTMLElement>('[data-raiox-status]');
  const elSpinner = dialog.querySelector<HTMLElement>('[data-raiox-spinner]');
  const elStatusTexto = dialog.querySelector<HTMLElement>('[data-raiox-status-texto]');
  const elAbasContainer = dialog.querySelector<HTMLElement>('[data-raiox-abas-container]');
  const elBase = dialog.getAttribute('data-raiox-base') || '/';

  function fecharDrawer(): void {
    dialog!.hidden = true;
    overlay!.hidden = true;
    siglaAtiva = null;
    if (gatilhoDisparador) {
      gatilhoDisparador.focus();
      gatilhoDisparador = null;
    }
  }

  function abrirDrawer(): void {
    dialog!.hidden = false;
    overlay!.hidden = false;
    btnFechar?.focus();
  }

  function mostrarStatus(msg: string, spinner = false): void {
    if (elStatus && elStatusTexto) {
      elStatus.hidden = false;
      elStatusTexto.textContent = msg;
      if (elSpinner) elSpinner.hidden = !spinner;
      if (elAbasContainer) elAbasContainer.hidden = true;
    }
  }

  function esconderStatus(): void {
    if (elStatus && elAbasContainer) {
      elStatus.hidden = true;
      elAbasContainer.hidden = false;
    }
  }

  async function carregarFixtureEExibir(sigla: string, campus: string, ano: number): Promise<void> {
    siglaAtiva = sigla;
    if (campus === 'todos') {
      mostrarStatus(
        'O Raio-X detalha registros de um campus individual selecionado. Selecione um campus específico no filtro acima para auditar os dados locais.',
        false,
      );
      return;
    }

    mostrarStatus(`Carregando registros de auditoria para ${sigla} (${campus} · ${ano})...`, true);

    try {
      const fixture: FixtureRaiox = await buscarFixture(elBase, sigla, campus, ano);
      esconderStatus();
      estadoAtual = criarEstadoInicial(fixture);
      renderizarComEstado();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao carregar os microdados de auditoria.';
      mostrarStatus(msg, false);
    }
  }

  callbackRecarregar = () => {
    if (dialog && !dialog.hidden && siglaAtiva) {
      const urlParams = new URLSearchParams(window.location.search);
      const campus = urlParams.get('campus') || 'serra';
      const anoRaw = urlParams.get('ano');
      const ano = anoRaw ? parseInt(anoRaw, 10) : 2026;
      carregarFixtureEExibir(siglaAtiva, campus, isNaN(ano) ? 2026 : ano);
    }
  };

  function tratarAcao(tipo: string, payload: unknown): void {
    if (!estadoAtual) return;

    if (tipo === 'trocar-aba' && typeof payload === 'string') {
      estadoAtual.simboloAbaAtiva = payload;
      renderizarComEstado();
    } else if (tipo === 'buscar') {
      const { simbolo, termo } = payload as { simbolo: string; termo: string };
      if (estadoAtual.abas[simbolo]) {
        estadoAtual.abas[simbolo].termoBusca = termo;
        estadoAtual.abas[simbolo].paginaAtual = 1;
        renderizarComEstado();
      }
    } else if (tipo === 'ordenar') {
      const { simbolo, campo, direcao } = payload as {
        simbolo: string;
        campo: string;
        direcao: 'asc' | 'desc';
      };
      if (estadoAtual.abas[simbolo]) {
        estadoAtual.abas[simbolo].colunaOrdenacao = campo;
        estadoAtual.abas[simbolo].direcaoOrdenacao = direcao;
        renderizarComEstado();
      }
    } else if (tipo === 'paginar') {
      const { simbolo, pagina } = payload as { simbolo: string; pagina: number };
      if (estadoAtual.abas[simbolo]) {
        estadoAtual.abas[simbolo].paginaAtual = pagina;
        renderizarComEstado();
      }
    }
  }

  function renderizarComEstado(): void {
    if (!estadoAtual) return;
    aplicarRaiox(dialog!, estadoAtual, tratarAcao);
  }

  // Ligações dos botões de gatilho
  const triggers = doc.querySelectorAll<HTMLElement>('[data-raiox-trigger]');
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      gatilhoDisparador = trigger;
      const sigla = trigger.getAttribute('data-raiox-trigger');
      if (!sigla) return;

      const urlParams = new URLSearchParams(window.location.search);
      const campus = urlParams.get('campus') || 'serra';
      const anoRaw = urlParams.get('ano');
      const ano = anoRaw ? parseInt(anoRaw, 10) : 2026;

      abrirDrawer();
      carregarFixtureEExibir(sigla, campus, isNaN(ano) ? 2026 : ano);
    });
  });

  // Fechamento via botão e overlay
  btnFechar?.addEventListener('click', fecharDrawer);
  overlay.addEventListener('click', fecharDrawer);

  // Fechamento via tecla ESC e ciclar TAB
  doc.addEventListener('keydown', (e) => {
    if (!dialog.hidden && e.key === 'Escape') {
      fecharDrawer();
    }
  });

  // Re-busca automática ao navegar no histórico (popstate)
  window.addEventListener('popstate', () => {
    if (callbackRecarregar) callbackRecarregar();
  });

  // Exportação CSV da aba ativa
  btnExportar?.addEventListener('click', () => {
    if (!estadoAtual) return;
    const compAtivo = estadoAtual.fixture.componentes.find(
      (c) => c.simbolo === estadoAtual!.simboloAbaAtiva,
    );
    if (!compAtivo || !compAtivo.detalhado) return;

    const estadoAba = estadoAtual.abas[compAtivo.simbolo];
    const termo = estadoAba?.termoBusca || '';
    const filtrados = filtrarRegistros(compAtivo.registros, compAtivo.campos, termo);
    const ordenados = estadoAba?.colunaOrdenacao
      ? ordenarRegistros(filtrados, estadoAba.colunaOrdenacao, estadoAba.direcaoOrdenacao)
      : filtrados;

    const csvContent = gerarCsvRaiox(ordenados, compAtivo.campos);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `raio-x_${estadoAtual.fixture.indicador}_${estadoAtual.fixture.campus}_${estadoAtual.fixture.ano}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}
