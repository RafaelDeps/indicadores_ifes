import { describe, expect, it } from 'vitest';
import { validarArquivosPilar } from '../../src/etl/validate';
import type { RegistroPilarJson } from '../../src/etl/types';

function arquivoValido(): RegistroPilarJson {
  return {
    nome: 'pilar1_serra_2024.json',
    conteudo: JSON.stringify({
      campus: 'Serra',
      ano_referencia: 2024,
      pilar: 'Engajamento Academico e Inclusao',
      indicadores: {
        NTPP: {
          descricao: 'Numero Total de Projetos de Pesquisa',
          projetos_pesquisa_registrados_execucao: 2,
          total_projetos_NTPP: 2,
        },
        QSPP: {
          descricao: 'Quantitativo de Servidores Desenvolvendo Projetos',
          SUPP_servidores_unicos_participantes: 1,
          total_servidores_QSPP: 1,
        },
        PIES: {
          descricao: 'Percentual de Estudantes Envolvidos em Pesquisa',
          NEP_estudantes_em_pesquisa: 1,
          NTE_total_estudantes_matriculados: null,
          percentual_calculado_PIES: null,
        },
        PICOT: {
          descricao: 'Percentual de Estudantes Cotistas Envolvidos em Pesquisa',
          NTECPP_cotistas_em_pesquisa: null,
          NEP_total_estudantes_em_pesquisa: 1,
          percentual_calculado_PICOT: null,
        },
      },
    }),
  };
}

describe('validarArquivosPilar (contrato 004, FR-012)', () => {
  it('aceita um pacote 100% válido sem lançar erro', () => {
    expect(() => validarArquivosPilar([arquivoValido()])).not.toThrow();
  });

  it('rejeita nome de arquivo fora do padrão (arquivo + regra na mensagem)', () => {
    const invalido = { ...arquivoValido(), nome: 'pilar1_Serra-2024.json' };
    expect(() => validarArquivosPilar([invalido])).toThrow(
      /pilar1_Serra-2024\.json.*nomenclatura/i,
    );
  });

  it('rejeita pilar com número inválido no nome', () => {
    const invalido = { ...arquivoValido(), nome: 'pilar4_serra_2024.json' };
    expect(() => validarArquivosPilar([invalido])).toThrow(/nomenclatura/);
  });

  it('rejeita header incompleto (campus ausente)', () => {
    const dados = JSON.parse(arquivoValido().conteudo);
    delete dados.campus;
    const invalido = { ...arquivoValido(), conteudo: JSON.stringify(dados) };
    expect(() => validarArquivosPilar([invalido])).toThrow(/cabeçalho.*campus/i);
  });

  it('rejeita nome de pilar incorreto para o número do arquivo', () => {
    const dados = JSON.parse(arquivoValido().conteudo);
    dados.pilar = 'Fomento e Conexao com o Ecossistema';
    const invalido = { ...arquivoValido(), conteudo: JSON.stringify(dados) };
    expect(() => validarArquivosPilar([invalido])).toThrow(/pilar.*Engajamento/i);
  });

  it('rejeita siglas de indicadores erradas para o pilar', () => {
    const dados = JSON.parse(arquivoValido().conteudo);
    delete dados.indicadores.QSPP;
    dados.indicadores.PINV = { descricao: 'x' };
    const invalido = { ...arquivoValido(), conteudo: JSON.stringify(dados) };
    expect(() => validarArquivosPilar([invalido])).toThrow(/QSPP/);
  });

  it('rejeita métrica com valor não numérico e não nulo', () => {
    const dados = JSON.parse(arquivoValido().conteudo);
    dados.indicadores.NTPP.total_projetos_NTPP = '534';
    const invalido = { ...arquivoValido(), conteudo: JSON.stringify(dados) };
    expect(() => validarArquivosPilar([invalido])).toThrow(/total_projetos_NTPP/);
  });

  it('rejeita NaN e números negativos', () => {
    const dados = JSON.parse(arquivoValido().conteudo);
    dados.indicadores.NTPP.total_projetos_NTPP = -1;
    const invalido = { ...arquivoValido(), conteudo: JSON.stringify(dados) };
    expect(() => validarArquivosPilar([invalido])).toThrow(/total_projetos_NTPP/);
  });

  it('rejeita campo não calculável preenchido (null obrigatório)', () => {
    const dados = JSON.parse(arquivoValido().conteudo);
    dados.indicadores.PIES.NTE_total_estudantes_matriculados = 1000;
    const invalido = { ...arquivoValido(), conteudo: JSON.stringify(dados) };
    expect(() => validarArquivosPilar([invalido])).toThrow(/NTE_total_estudantes_matriculados/);
  });

  it('violación identifica arquivo, campo e regra', () => {
    const dados = JSON.parse(arquivoValido().conteudo);
    dados.indicadores.PIES.percentual_calculado_PIES = 0;
    const invalido = { ...arquivoValido(), conteudo: JSON.stringify(dados) };
    expect(() => validarArquivosPilar([invalido])).toThrow(
      /pilar1_serra_2024\.json.*percentual_calculado_PIES/i,
    );
  });
});
