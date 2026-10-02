/**
 * Deriva o slug de campus a partir do nome oficial: lowercase, sem
 * diacríticos (NFD) e sem caracteres não alfanuméricos.
 * Ex.: "Vila Velha" → "vilavelha", "Vitória" → "vitoria".
 * Compartilhado pelo ingestor do site e pelo ETL (specs/006).
 */
export function slugificarCampus(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}
