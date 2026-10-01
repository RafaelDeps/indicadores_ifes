import { describe, expect, it } from 'vitest';
import { extrairParametrosDeUrl } from '../../src/lib/contexto-cliente';

describe('contexto-url (leitura e extração de parâmetros de busca)', () => {
  it('extrai campus e ano quando ambos estão presentes na query string', () => {
    const params = extrairParametrosDeUrl('?campus=serra&ano=2024');
    expect(params.campus).toBe('serra');
    expect(params.ano).toBe('2024');
  });

  it('retorna nulos quando a URL não possui parâmetros', () => {
    const params = extrairParametrosDeUrl('');
    expect(params.campus).toBeNull();
    expect(params.ano).toBeNull();
  });

  it('extrai apenas o ano quando campus não foi especificado', () => {
    const params = extrairParametrosDeUrl('?ano=2025');
    expect(params.campus).toBeNull();
    expect(params.ano).toBe('2025');
  });

  it('extrai apenas o campus quando ano não foi especificado', () => {
    const params = extrairParametrosDeUrl('?campus=vitoria');
    expect(params.campus).toBe('vitoria');
    expect(params.ano).toBeNull();
  });
});
