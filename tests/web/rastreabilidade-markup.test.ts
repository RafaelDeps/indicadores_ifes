import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fonteSecao = readFileSync('src/components/SecaoRastreabilidade.astro', 'utf-8');
const fonteMemoria = readFileSync('src/components/MemoriaCalculo.astro', 'utf-8');

describe('SecaoRastreabilidade.astro — marcação da rastreabilidade (spec 025, contract C-4)', () => {
  it('seção semântica com id de âncora e título rotulado (FR-010)', () => {
    expect(fonteSecao).toMatch(/<section[^>]*id=\{?rastreabilidade\.secaoId/);
    expect(fonteSecao).toContain('aria-labelledby');
    expect(fonteSecao).toMatch(/<h2/);
  });

  it('download só para artefato disponível, com atributo download (FR-008)', () => {
    // A âncora de download deve estar DENTRO do condicional de disponibilidade.
    const bloco = fonteSecao.match(
      /artefato\.disponivel\s*&&\s*\([\s\S]{0,500}?<a[\s\S]*?download[\s\S]*?<\/a>/,
    );
    expect(bloco).toBeTruthy();
  });

  it('motivo de indisponibilidade renderizado como texto (nunca link quebrado)', () => {
    expect(fonteSecao).toContain('motivoIndisponivel');
  });

  it('aviso do portão com role="status" e sem identificadores internos (Princípio IV)', () => {
    expect(fonteSecao).toContain('role="status"');
    expect(fonteSecao).toContain('avisoPortao');
  });

  it('proveniência exibida: data de atualização, tamanho, origem e revisão (FR-009)', () => {
    expect(fonteSecao).toContain('atualizadoEmFormatado');
    expect(fonteSecao).toContain('formatBytesLegivel');
    expect(fonteSecao).toContain('origem');
    expect(fonteSecao).toContain('revisao');
  });

  it('aponta para a página de dados como fonte das regras (clarificação Q3, Opção A)', () => {
    expect(fonteSecao).toMatch(/dados\/?["'`]/);
  });
});

describe('MemoriaCalculo.astro — citação dos arquivos de origem (clarificação Q1, Opção C)', () => {
  it('cita os arquivos de origem com atalho para a seção do pilar (FR-007)', () => {
    expect(fonteMemoria).toContain('rastreabilidade-pilar-');
    expect(fonteMemoria).toContain('citacoes');
  });

  it('a citação usa o rótulo canônico do artefato (FR-009)', () => {
    expect(fonteMemoria).toMatch(/citacoes\.map/);
    expect(fonteMemoria).toMatch(/rotulo/);
  });
});
