import type { ComponenteRaiox, FixtureRaiox } from '../../src/lib/raiox';

/**
 * Fixture sintética para os testes do Raio-X (spec 026) — contrato
 * contracts/fixture-auditoria.md. Espelha os casos notáveis:
 * - NEP: contagem com registros de pessoa (nome/projeto/papel + matrícula/
 *   curso quando há match; null quando não há — D-3);
 * - NTE: contagem de matrículas (listagens);
 * - OCC: componente sem fonte (detalhado: false — D-2);
 * - TAFPPI: soma em R$ (D-4).
 */

export const componenteNep: ComponenteRaiox = {
  papel: 'numerador',
  simbolo: 'NEP',
  rotulo: 'Estudantes em Pesquisa',
  unidade: 'Estudantes',
  tipoContagem: 'contagem',
  apurado: 3,
  detalhado: true,
  campos: ['nome', 'projeto', 'papel', 'matricula', 'curso'],
  registros: [
    {
      nome: 'Ana Souza',
      projeto: 'Projeto Álgebra Aplicada',
      papel: 'Student',
      matricula: '20240001',
      curso: 'Análise e Desenvolvimento de Sistemas',
    },
    {
      nome: 'Bruno Lima',
      projeto: 'Projeto Sistemas Embarcados',
      papel: 'Student',
      matricula: '20240002',
      curso: 'Enfermagem',
    },
    {
      nome: 'Carla Dias',
      projeto: 'Projeto Álgebra Aplicada',
      papel: 'Bolsista',
      matricula: null,
      curso: null,
    },
  ],
};

export const componenteNte: ComponenteRaiox = {
  papel: 'denominador',
  simbolo: 'NTE',
  rotulo: 'Total de Estudantes Matriculados',
  unidade: 'Estudantes',
  tipoContagem: 'contagem',
  apurado: 2,
  detalhado: true,
  campos: ['matricula', 'nome', 'curso', 'situacao'],
  registros: [
    {
      matricula: '20240001',
      nome: 'Beatriz Rocha',
      curso: 'Análise e Desenvolvimento de Sistemas',
      situacao: 'Matriculado',
    },
    { matricula: '20240009', nome: 'Danilo Costa', curso: 'Zootecnia', situacao: 'Formado' },
  ],
};

export const componenteOcc: ComponenteRaiox = {
  papel: 'denominador',
  simbolo: 'OCC',
  rotulo: 'Orçamento Total de Capital e Custeio',
  unidade: 'R$',
  tipoContagem: 'soma',
  apurado: null,
  detalhado: false,
  campos: [],
  registros: [],
};

export const componenteTafppi: ComponenteRaiox = {
  papel: 'parcela',
  simbolo: 'TAFPPI',
  rotulo: 'Total de Aporte em Pesquisa e Pós-Graduação',
  unidade: 'R$',
  tipoContagem: 'soma',
  apurado: 45000,
  detalhado: true,
  campos: ['projeto', 'codigo', 'valor', 'fonte'],
  registros: [
    { projeto: 'Projeto Sistemas Embarcados', codigo: 'PJ-001', valor: 25000, fonte: 'FAPES' },
    { projeto: 'Projeto Álgebra Aplicada', codigo: 'PJ-002', valor: 20000, fonte: 'CNPq' },
  ],
};

export const fixtureRaiox: FixtureRaiox = {
  indicador: 'PIES',
  campus: 'serra',
  ano: 2025,
  geradoEm: '2026-10-15',
  fontes: [
    { arquivo: 'exports_canonical.zip', revisao: null },
    { arquivo: 'listagem_2025_1.xlsx', revisao: '2025-1' },
  ],
  componentes: [componenteNep, componenteNte],
};

export const fixtureRaioxPilar2: FixtureRaiox = {
  indicador: 'PINV',
  campus: 'serra',
  ano: 2025,
  geradoEm: '2026-10-15',
  fontes: [{ arquivo: 'exports_canonical.zip', revisao: null }],
  componentes: [componenteTafppi, componenteOcc],
};
