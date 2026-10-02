export const CHAVE_STORAGE_TEMA = 'indicadores_tema';

export type Tema = 'claro' | 'escuro' | 'auto';

export function proximoTema(atual: Tema): 'claro' | 'escuro' {
  return atual === 'escuro' ? 'claro' : 'escuro';
}

export function resolverTemaEfetivo(tema: Tema, prefersDark: boolean): 'claro' | 'escuro' {
  if (tema === 'claro') return 'claro';
  if (tema === 'escuro') return 'escuro';
  return prefersDark ? 'escuro' : 'claro';
}

export function obterTemaSalvo(storage?: Storage): 'claro' | 'escuro' {
  try {
    const s = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!s) return 'claro';
    const valor = s.getItem(CHAVE_STORAGE_TEMA);
    if (valor === 'claro' || valor === 'escuro') {
      return valor;
    }
    if (
      valor === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ) {
      return 'escuro';
    }
  } catch {
    // fallback gracioso em caso de restrições de privacidade
  }
  return 'claro';
}

export function salvarTema(tema: Tema, storage?: Storage): void {
  try {
    const s = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (s) {
      s.setItem(CHAVE_STORAGE_TEMA, tema);
    }
  } catch {
    // fallback silencioso
  }
}

export function aplicarTema(doc: Document, tema: 'claro' | 'escuro', storage?: Storage): void {
  salvarTema(tema, storage);

  const elHtml = doc.documentElement;
  if (elHtml) {
    elHtml.setAttribute('data-theme', tema);
  }

  const botoes = doc.querySelectorAll<HTMLButtonElement>('[data-btn-tema]');
  botoes.forEach((btn) => {
    const valor = btn.getAttribute('data-btn-tema');
    if (valor === 'claro' || valor === 'escuro') {
      const ativo = valor === tema;
      btn.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      btn.setAttribute('data-tema-ativo', ativo ? 'true' : 'false');
    } else {
      btn.setAttribute('aria-label', `Alternar tema visual (atualmente: ${tema})`);
      btn.setAttribute('data-tema-atual', tema);
    }
  });
}
