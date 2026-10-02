function parseHtmlFragments(html: string): ElementoMock[] {
  const root = new ElementoMock('root');
  const stack: ElementoMock[] = [root];

  const tagTokenRegex = /<(\/)?([a-zA-Z0-9]+)([^>]*)(\/)?>|([^<]+)/g;
  let match;
  while ((match = tagTokenRegex.exec(html)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2];
    const attrsStr = match[3];
    const isSelfClosing =
      match[4] === '/' ||
      tagName === 'circle' ||
      tagName === 'rect' ||
      tagName === 'line' ||
      tagName === 'path';
    const text = match[5];

    if (text) {
      const trimmed = text.trim();
      if (trimmed) {
        stack[stack.length - 1].textContent = trimmed;
      }
    } else if (isClosing) {
      if (stack.length > 1) {
        stack.pop();
      }
    } else if (tagName) {
      const el = new ElementoMock(tagName);
      if (attrsStr) {
        const attrRegex = /([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g;
        let am;
        while ((am = attrRegex.exec(attrsStr)) !== null) {
          if (am[1] === 'class') {
            am[2]
              ?.split(/\s+/)
              .filter(Boolean)
              .forEach((c) => el.classList.add(c));
          } else {
            el.setAttribute(am[1], am[2] ?? '');
          }
        }
      }
      stack[stack.length - 1].appendChild(el);
      if (!isSelfClosing) {
        stack.push(el);
      }
    }
  }

  return root.children;
}

export class ElementoMock {
  tagName: string;
  textContent: string = '';
  private _innerHTML: string = '';
  attributes: Record<string, string> = {};
  style: Record<string, string> = {};
  classList = {
    classes: new Set<string>(),
    add: (c: string) => this.classList.classes.add(c),
    remove: (c: string) => this.classList.classes.delete(c),
    contains: (c: string) => this.classList.classes.has(c),
  };
  children: ElementoMock[] = [];

  constructor(tagName = 'div') {
    this.tagName = tagName;
  }

  get innerHTML(): string {
    return this._innerHTML;
  }

  set innerHTML(html: string) {
    this._innerHTML = html;
    this.children = parseHtmlFragments(html);
  }

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }

  removeAttribute(name: string) {
    delete this.attributes[name];
  }

  parentElement: ElementoMock | null = null;

  appendChild(el: ElementoMock) {
    el.parentElement = this;
    this.children.push(el);
  }

  closest(seletor: string): ElementoMock | null {
    if (this.matches(seletor)) return this;
    if (this.parentElement) return this.parentElement.closest(seletor);
    return null;
  }

  querySelector(seletor: string): ElementoMock | null {
    if (seletor.includes(' ')) {
      const [parentSel, ...rest] = seletor.split(/\s+/);
      const parent = this.querySelector(parentSel);
      return parent ? parent.querySelector(rest.join(' ')) : null;
    }
    if (this.matches(seletor)) return this;
    for (const child of this.children) {
      if (child.matches(seletor)) return child;
      const found = child.querySelector(seletor);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(seletor: string): ElementoMock[] {
    const res: ElementoMock[] = [];
    for (const child of this.children) {
      if (child.matches(seletor)) res.push(child);
      res.push(...child.querySelectorAll(seletor));
    }
    return res;
  }

  matches(seletor: string): boolean {
    if (seletor.startsWith('.') && this.classList.contains(seletor.slice(1))) return true;
    if (seletor.toLowerCase() === this.tagName.toLowerCase()) return true;

    // Checa seletores compostos de atributos ex: [data-componente-qtd="NEP"][data-componente-ano="2024"]
    const allAttrMatches = [...seletor.matchAll(/\[([^=\]]+)(?:="([^"]+)")?\]/g)];
    if (allAttrMatches.length > 0) {
      return allAttrMatches.every((m) => {
        const attrName = m[1];
        const attrVal = m[2];
        if (attrVal !== undefined) {
          return this.getAttribute(attrName) === attrVal;
        }
        return this.getAttribute(attrName) !== null;
      });
    }

    return false;
  }
}

export function criarElementoMock(tagName = 'div', attrs?: Record<string, string>): ElementoMock {
  const el = new ElementoMock(tagName);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') {
        v.split(/\s+/)
          .filter(Boolean)
          .forEach((c) => el.classList.add(c));
      } else {
        el.setAttribute(k, v);
      }
    }
  }
  return el;
}

export class DocumentMock {
  corpo: ElementoMock;

  constructor() {
    this.corpo = new ElementoMock('body');
  }

  querySelector(seletor: string): ElementoMock | null {
    return this.corpo.querySelector(seletor);
  }

  querySelectorAll(seletor: string): ElementoMock[] {
    return this.corpo.querySelectorAll(seletor);
  }
}

export function criarDomDetalheMock(): DocumentMock {
  const doc = new DocumentMock();

  // Banner
  const bannerWrapper = new ElementoMock('div');
  const bannerSiglaEl = new ElementoMock('div');
  bannerSiglaEl.setAttribute('data-detalhe-sigla', 'NTPP');

  const rotuloAnoEl = new ElementoMock('span');
  rotuloAnoEl.setAttribute('data-detalhe-ano-rotulo', '');
  rotuloAnoEl.textContent = 'Resultado apurado (2026)';
  bannerSiglaEl.appendChild(rotuloAnoEl);

  const valorEl = new ElementoMock('span');
  valorEl.setAttribute('data-detalhe-valor', '');
  valorEl.textContent = '18';
  bannerSiglaEl.appendChild(valorEl);

  const unidadeEl = new ElementoMock('span');
  unidadeEl.setAttribute('data-detalhe-unidade', '');
  unidadeEl.textContent = 'projetos';
  bannerSiglaEl.appendChild(unidadeEl);

  bannerWrapper.appendChild(bannerSiglaEl);
  doc.corpo.appendChild(bannerWrapper);

  // Gráfico
  const graficoWrapper = new ElementoMock('div');
  const svgEl = new ElementoMock('svg');
  svgEl.setAttribute('data-grafico-svg', '');

  const pathEl = new ElementoMock('path');
  pathEl.setAttribute('data-grafico-linha', '');
  svgEl.appendChild(pathEl);

  const escalaEl = new ElementoMock('g');
  escalaEl.setAttribute('data-grafico-escala', '');
  svgEl.appendChild(escalaEl);

  const pontosEl = new ElementoMock('g');
  pontosEl.setAttribute('data-grafico-pontos', '');
  svgEl.appendChild(pontosEl);

  graficoWrapper.appendChild(svgEl);

  const vazioEl = new ElementoMock('p');
  vazioEl.setAttribute('data-grafico-vazio', '');
  vazioEl.style.display = 'none';
  graficoWrapper.appendChild(vazioEl);

  doc.corpo.appendChild(graficoWrapper);

  // Tabela Histórica
  const tabelaEl = new ElementoMock('table');
  tabelaEl.setAttribute('data-tabela-historico', '');
  const tbodyEl = new ElementoMock('tbody');
  tbodyEl.setAttribute('data-historico-corpo', '');
  tabelaEl.appendChild(tbodyEl);
  doc.corpo.appendChild(tabelaEl);

  // Componentes
  const compWrapper = new ElementoMock('div');
  for (const [ano, qtd] of [
    ['2024', '50'],
    ['2025', '65'],
    ['2026', '80'],
  ]) {
    const c = new ElementoMock('span');
    c.setAttribute('data-componente-qtd', 'NEP');
    c.setAttribute('data-componente-ano', ano);
    c.textContent = qtd;
    compWrapper.appendChild(c);
  }
  doc.corpo.appendChild(compWrapper);

  // Delta
  const deltaEl = new ElementoMock('div');
  deltaEl.setAttribute('data-card-delta', 'NTPP');
  doc.corpo.appendChild(deltaEl);

  return doc;
}
