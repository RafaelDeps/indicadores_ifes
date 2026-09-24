/**
 * Transform — iniciativas: regra de atividade por ano (FR-006), resolução
 * de campus (FR-005, research.md D5) e conjuntos de participação por
 * campus/ano com deduplicação por pessoa (FR-007, FR-011).
 */
import type { RegistroPessoas } from './people';
import type { ExportCanonicos, Iniciativa } from './types';

export interface ParticipacaoAno {
  projetos: number;
  staffIds: Set<number>;
  studentIds: Set<number>;
}

export interface ResultadoIniciativas {
  porCampusAno: Map<string, Map<number, ParticipacaoAno>>;
  avisos: string[];
}

function parteData(dataIso: string | null): string | null {
  return dataIso ? dataIso.slice(0, 10) : null;
}

export function ativaEmAno(iniciativa: Iniciativa, ano: number): boolean {
  const inicio = parteData(iniciativa.start_date);
  if (!inicio) return false;
  const fim = parteData(iniciativa.end_date);
  return inicio <= `${ano}-12-31` && (fim === null || fim >= `${ano}-01-01`);
}

export function resolverCampus(iniciativa: Iniciativa, registro: RegistroPessoas): string | null {
  if (iniciativa.campus) return iniciativa.campus.name;
  const equipe = iniciativa.team ?? [];
  const coordenador = equipe.find(
    (m) => m.roles.includes('Coordinator') && registro.get(m.person_id)?.campus,
  );
  if (coordenador) return registro.get(coordenador.person_id)!.campus!.name;
  const membro = equipe.find((m) => registro.get(m.person_id)?.campus);
  if (membro) return registro.get(membro.person_id)!.campus!.name;
  return null;
}

function participacaoVazia(): ParticipacaoAno {
  return { projetos: 0, staffIds: new Set(), studentIds: new Set() };
}

export function agregarIniciativas(
  exportacao: ExportCanonicos,
  registro: RegistroPessoas,
  anos: number[],
): ResultadoIniciativas {
  const porCampusAno = new Map<string, Map<number, ParticipacaoAno>>();
  const avisos: string[] = [];
  const avisadosNuloInicio = new Set<number>();
  const avisadosSemCampus = new Set<number>();

  const escopos = (nomeCampus: string | null): string[] =>
    nomeCampus === null ? ['todos'] : [nomeCampus, 'todos'];

  const obter = (escopo: string, ano: number): ParticipacaoAno => {
    let porAno = porCampusAno.get(escopo);
    if (!porAno) {
      porAno = new Map();
      porCampusAno.set(escopo, porAno);
    }
    let participacao = porAno.get(ano);
    if (!participacao) {
      participacao = participacaoVazia();
      porAno.set(ano, participacao);
    }
    return participacao;
  };

  for (const iniciativa of exportacao.iniciativas) {
    if (iniciativa.initiative_type?.name !== 'Research Project') continue;

    if (!iniciativa.start_date && !avisadosNuloInicio.has(iniciativa.id)) {
      avisadosNuloInicio.add(iniciativa.id);
      avisos.push(`AVISO: iniciativa ${iniciativa.id} sem start_date — tratada como nunca ativa`);
    }

    const campusEfetivo = resolverCampus(iniciativa, registro);
    if (campusEfetivo === null && !avisadosSemCampus.has(iniciativa.id)) {
      avisadosSemCampus.add(iniciativa.id);
      avisos.push(
        `AVISO: iniciativa ${iniciativa.id} sem campus resolvível — contabilizada apenas no escopo "todos"`,
      );
    }

    for (const ano of anos) {
      if (!ativaEmAno(iniciativa, ano)) continue;
      for (const escopo of escopos(campusEfetivo)) {
        const participacao = obter(escopo, ano);
        participacao.projetos += 1;
        for (const membro of iniciativa.team ?? []) {
          const pessoa = registro.get(membro.person_id);
          const papelStaff =
            membro.roles.includes('Coordinator') || membro.roles.includes('Researcher');
          if (papelStaff && pessoa?.classification === 'researcher') {
            participacao.staffIds.add(membro.person_id);
          }
          if (membro.roles.includes('Student')) {
            participacao.studentIds.add(membro.person_id);
          }
        }
      }
    }
  }

  return { porCampusAno, avisos };
}
