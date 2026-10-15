import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizarBuscaRaiox,
  filtrarRegistros,
  ordenarRegistros,
  paginarRegistros,
  construirResumo,
  buscarFixture,
  gerarCsvRaiox,
  construirRodapeRaiox,
} from '../../src/lib/raiox';
import {
  componenteNep,
  componenteNte,
  componenteOcc,
  componenteTafppi,
  fixtureRaiox,
} from './fixtures/raiox-fixture';

describe('raiox: funções puras (spec 026, contracts/dom-raiox.md)', () => {
  describe('normalizarBuscaRaiox', () => {
    it('remove acentos, diacríticos e normaliza caixa', () => {
      expect(normalizarBuscaRaiox('Álgebra Aplicada')).toBe('algebra aplicada');
      expect(normalizarBuscaRaiox('  SISTEMAS EMBARCADOS  ')).toBe('sistemas embarcados');
    });
  });

  describe('construirResumo', () => {
    it('selo para contagem conferida', () => {
      const resumo = construirResumo(componenteNep);
      expect(resumo.conferido).toBe(true);
      expect(resumo.divergencia).toBe(false);
      expect(resumo.textoSelo).toContain('3 registros listados');
      expect(resumo.textoSelo).toContain('3 ✓ (Conferido)');
    });

    it('selo para soma R$ conferida', () => {
      const resumo = construirResumo(componenteTafppi);
      expect(resumo.conferido).toBe(true);
      expect(resumo.divergencia).toBe(false);
      expect(resumo.textoSelo).toContain('2 registros');
      expect(resumo.textoSelo).toContain('✓ (Conferido)');
    });

    it('selo para componente não detalhado (sem fonte)', () => {
      const resumo = construirResumo(componenteOcc);
      expect(resumo.conferido).toBe(false);
      expect(resumo.divergencia).toBe(false);
      expect(resumo.textoSelo).toContain('Sem detalhamento');
    });

    it('selo para divergência de contagem', () => {
      const compDivergente = {
        ...componenteNep,
        apurado: 99,
      };
      const resumo = construirResumo(compDivergente);
      expect(resumo.conferido).toBe(false);
      expect(resumo.divergencia).toBe(true);
      expect(resumo.textoSelo).toContain('Divergência');
    });
  });

  describe('filtrarRegistros', () => {
    it('filtra por qualquer campo textual, insensível a acento e caixa', () => {
      const campos = ['nome', 'projeto', 'papel', 'curso'];
      const resultado = filtrarRegistros(componenteNep.registros, campos, 'algebra');
      expect(resultado).toHaveLength(2); // Ana e Carla
      expect(resultado.map((r) => r.nome)).toEqual(['Ana Souza', 'Carla Dias']);
    });

    it('termo vazio retorna todos os registros', () => {
      const resultado = filtrarRegistros(componenteNep.registros, ['nome'], '   ');
      expect(resultado).toHaveLength(componenteNep.registros.length);
    });
  });

  describe('ordenarRegistros', () => {
    it('ordena ascendente e descendente de forma estável, null por último', () => {
      const asc = ordenarRegistros(componenteNep.registros, 'curso', 'asc');
      expect(asc[0].curso).toBe('Análise e Desenvolvimento de Sistemas');
      expect(asc[1].curso).toBe('Enfermagem');
      expect(asc[2].curso).toBeNull(); // Carla Dias com null por último

      const desc = ordenarRegistros(componenteNep.registros, 'curso', 'desc');
      expect(desc[0].curso).toBe('Enfermagem');
      expect(desc[1].curso).toBe('Análise e Desenvolvimento de Sistemas');
      expect(desc[2].curso).toBeNull();
    });

    it('ordena valores numéricos corretamente', () => {
      const desc = ordenarRegistros(componenteTafppi.registros, 'valor', 'desc');
      expect(desc[0].valor).toBe(25000);
      expect(desc[1].valor).toBe(20000);
    });
  });

  describe('paginarRegistros', () => {
    it('divide fatias conforme porPagina', () => {
      const { fatia, totalPaginas } = paginarRegistros(componenteNep.registros, 1, 25);
      expect(totalPaginas).toBe(1);
      expect(fatia).toHaveLength(3);
    });

    it('retorna fatia vazia se página for além do limite', () => {
      const { fatia } = paginarRegistros(componenteNep.registros, 99, 25);
      expect(fatia).toHaveLength(0);
    });
  });

  describe('buscarFixture', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('retorna fixture quando 200 OK', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => fixtureRaiox,
      });

      const res = await buscarFixture('/', 'PIES', 'serra', 2025);
      expect(res.indicador).toBe('PIES');
      expect(global.fetch).toHaveBeenCalledWith('/auditoria/PIES_serra_2025.json');
    });

    it('lança erro específico sem fixture quando 404', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(buscarFixture('/sub/', 'PIES', 'serra', 2025)).rejects.toThrow(
        /sem fixture de auditoria/i,
      );
      expect(global.fetch).toHaveBeenCalledWith('/sub/auditoria/PIES_serra_2025.json');
    });
  });

  describe('gerarCsvRaiox (T021)', () => {
    it('gera CSV com BOM UTF-8, cabeçalhos amigáveis e registros', () => {
      const csv = gerarCsvRaiox(componenteNep.registros, componenteNep.campos);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Nome,Projeto,Vínculo / Papel,Matrícula,Curso');
      expect(csv).toContain('Ana Souza');
    });

    it('escapa vírgula, aspas e quebra de linha conforme RFC 4180', () => {
      const registros = [
        {
          nome: 'Silva, João',
          projeto: 'Projeto "Inovação"',
          papel: 'Linha 1\nLinha 2',
        },
      ];
      const csv = gerarCsvRaiox(registros, ['nome', 'projeto', 'papel']);
      expect(csv).toContain('"Silva, João"');
      expect(csv).toContain('"Projeto ""Inovação"""');
      expect(csv).toContain('"Linha 1\nLinha 2"');
    });
  });

  describe('construirRodapeRaiox (T021)', () => {
    it('substitui variáveis da fórmula fracionária pelos apurados', () => {
      const rodape = construirRodapeRaiox('PIES', [componenteNep, componenteNte], 150);
      expect(rodape.formulaDeclarada).toContain('PIES = (NEP / NTE) × 100');
      expect(rodape.formulaSubstituida).toContain('(3 / 2) × 100');
      expect(rodape.valorPublicado).toBe(150);
    });

    it('adiciona nota de governança transparente quando a aritmética diverge do publicado', () => {
      const rodape = construirRodapeRaiox('PIES', [componenteNep, componenteNte], 99);
      expect(rodape.notaGovernanca).toBeDefined();
      expect(rodape.notaGovernanca).toContain('apuração oficial');
    });
  });
});
