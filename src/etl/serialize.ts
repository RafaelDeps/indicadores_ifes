/**
 * Utilitários de serialização determinística: ordenação estável por id e
 * JSON compacto com ordem de inserção de chaves (base do determinismo
 * exigido por FR-011).
 */

export function ordenarPorId<T extends { id: number }>(registros: T[]): T[] {
  return [...registros].sort((a, b) => a.id - b.id);
}

export function jsonCompacto(objeto: unknown): string {
  return JSON.stringify(objeto);
}
