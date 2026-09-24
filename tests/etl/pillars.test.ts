import { describe, expect, it } from 'vitest';
import { agregar, montarArquivosPilar } from '../../src/etl/pillars';
import { agregarIniciativas } from '../../src/etl/initiatives';
import { agregarProducoes } from '../../src/etl/productions';
import { criarRegistroPessoas } from '../../src/etl/people';
import { jsonCompacto } from '../../src/etl/serialize';
import type { ExportCanonicos } from '../../src/etl/types';
import {
  ANOS_ALVO,
  ARTIGOS_FIXTURE,
  AUTORES_PRODUCAO_FIXTURE,
  CAMPI_FIXTURE,
  INICIATIVAS_FIXTURE,
  PESSOAS_FIXTURE,
  PRODUCOES_FIXTURE,
  SLUGS_ESPERADOS,
  TIPOS_PRODUCAO_FIXTURE,
} from './fixtures';

function exportacaoFixture(): ExportCanonicos {
  return {
    iniciativas: INICIATIVAS_FIXTURE,
    pessoas: PESSOAS_FIXTURE,
    estudantes: [],
    campi: CAMPI_FIXTURE,
    artigos: ARTIGOS_FIXTURE,
    producoes: PRODUCOES_FIXTURE,
    autoresProducao: AUTORES_PRODUCAO_FIXTURE,
    tiposProducao: TIPOS_PRODUCAO_FIXTURE,
    avisos: [],
  };
}

function montarTudo() {
  const registro = criarRegistroPessoas(PESSOAS_FIXTURE);
  const iniciativas = agregarIniciativas(exportacaoFixture(), registro, ANOS_ALVO);
  const producoes = agregarProducoes(exportacaoFixture(), registro, ANOS_ALVO);
  const agregados = agregar(iniciativas, producoes, ANOS_ALVO);
  return montarArquivosPilar(agregados, CAMPI_FIXTURE, ANOS_ALVO);
}

describe('montarArquivosPilar', () => {
  const arquivos = montarTudo();

  it('gera 3 pilares × (3 campi + todos) × 3 anos = 36 arquivos', () => {
    expect(arquivos).toHaveLength(36);
  });

  it('nomenclatura estrita com slugs esperados', () => {
    const nomes = arquivos.map((a) => a.nome);
    for (const nome of nomes) {
      expect(nome).toMatch(/^pilar[123]_[a-z0-9]+_\d{4}\.json$/);
    }
    for (const slug of SLUGS_ESPERADOS) {
      expect(nomes.some((n) => n.includes(`_${slug}_`))).toBe(true);
    }
    expect(nomes).toContain('pilar1_todos_2024.json');
    expect(nomes).toContain('pilar3_vilavelha_2026.json');
  });

  it('cabeçalho com campus oficial, ano e nome exato do pilar', () => {
    const pilar1 = JSON.parse(arquivos.find((a) => a.nome === 'pilar1_serra_2024.json')!.conteudo);
    expect(pilar1.campus).toBe('Serra');
    expect(pilar1.ano_referencia).toBe(2024);
    expect(pilar1.pilar).toBe('Engajamento Academico e Inclusao');

    const pilar2 = JSON.parse(arquivos.find((a) => a.nome === 'pilar2_todos_2025.json')!.conteudo);
    expect(pilar2.campus).toBe('Todos os Campi');
    expect(pilar2.pilar).toBe('Fomento e Conexao com o Ecossistema');

    const pilar3 = JSON.parse(
      arquivos.find((a) => a.nome === 'pilar3_vitoria_2024.json')!.conteudo,
    );
    expect(pilar3.pilar).toBe('Produtividade e Propriedade Intelectual');
  });

  it('NTPP/QSPP/NEP refletem os agregados por campus e todos', () => {
    const p1 = JSON.parse(arquivos.find((a) => a.nome === 'pilar1_serra_2024.json')!.conteudo);
    expect(p1.indicadores.NTPP.total_projetos_NTPP).toBe(2);
    expect(p1.indicadores.QSPP.total_servidores_QSPP).toBe(2); // P1 (I1) + P4 (I3)
    expect(p1.indicadores.PIES.NEP_estudantes_em_pesquisa).toBe(1);
    expect(p1.indicadores.PICOT.NEP_total_estudantes_em_pesquisa).toBe(1);

    const p1Todos = JSON.parse(arquivos.find((a) => a.nome === 'pilar1_todos_2024.json')!.conteudo);
    expect(p1Todos.indicadores.NTPP.total_projetos_NTPP).toBe(5);
    expect(p1Todos.indicadores.QSPP.total_servidores_QSPP).toBe(3);
    expect(p1Todos.indicadores.PIES.NEP_estudantes_em_pesquisa).toBe(2);
  });

  it('PIPRO = NPB + NPT com total por campus e todos', () => {
    const p3 = JSON.parse(arquivos.find((a) => a.nome === 'pilar3_serra_2024.json')!.conteudo);
    expect(p3.indicadores.PIPRO.NPB_producoes_academicas_bibliograficas).toBe(1);
    expect(p3.indicadores.PIPRO.NPT_producoes_tecnicas_tecnologicas).toBe(1);
    expect(p3.indicadores.PIPRO.total_producao_PIPRO).toBe(2);

    const p3Todos = JSON.parse(arquivos.find((a) => a.nome === 'pilar3_todos_2024.json')!.conteudo);
    expect(p3Todos.indicadores.PIPRO.total_producao_PIPRO).toBe(4);
  });

  it('PIPROT: PA/DI = 0 verificado, PC do dado, demais null, total = soma numérica', () => {
    const p3 = JSON.parse(arquivos.find((a) => a.nome === 'pilar3_vitoria_2024.json')!.conteudo);
    const valores = p3.indicadores.PIPROT.valores_totais_por_tipo;
    expect(valores.PA_patentes_e_modelos_utilidade).toBe(0);
    expect(valores.DI_desenhos_industriais).toBe(0);
    expect(valores.PC_programas_computador).toBe(1);
    expect(valores.RM_registros_marca).toBeNull();
    expect(valores.C_cultivares).toBeNull();
    expect(valores.TC_topografia_circuitos).toBeNull();
    expect(valores.OGM_organismos_geneticamente_modificados).toBeNull();
    expect(p3.indicadores.PIPROT.total_acumulado_PIPROT).toBe(1);
  });

  it('serialização compacta e determinística (chaves em ordem fixa)', () => {
    const arquivo = arquivos.find((a) => a.nome === 'pilar1_serra_2024.json')!;
    expect(arquivo.conteudo).toBe(jsonCompacto(JSON.parse(arquivo.conteudo)));
  });
});

describe('agregar (integração de contagens)', () => {
  it('campus do catálogo sem dados produz agregados zerados', () => {
    const registro = criarRegistroPessoas(PESSOAS_FIXTURE);
    const agregados = agregar(
      agregarIniciativas(exportacaoFixture(), registro, ANOS_ALVO),
      agregarProducoes(exportacaoFixture(), registro, ANOS_ALVO),
      ANOS_ALVO,
    );
    const vilaVelha = agregados.porCampusAno.get('Vila Velha')!.get(2024)!;
    expect(vilaVelha.ntpp).toBe(0);
    expect(vilaVelha.qspp).toBe(0);
    expect(vilaVelha.nep).toBe(0);
    expect(vilaVelha.npb).toBe(0);
    expect(vilaVelha.npt).toBe(0);
    expect(vilaVelha.pc).toBe(0);
  });
});
