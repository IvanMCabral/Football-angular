import { environment as production } from './environment.prod';
import { environment as staging } from './environment.staging';
import { environment as diagnostic } from './environment.diagnostic';

describe('deployed environment contract', () => {
  for (const [name, environment] of [
    ['production', production],
    ['staging', staging]
  ] as const) {
    it(`${name} uses the public Render API for HTTP and SSE`, () => {
      expect(environment.apiUrl).toBe('https://manager-staging-api.onrender.com/api/v1');
      expect(environment.apiUrl).toMatch(/^https:\/\/manager-staging-api\.onrender\.com\/api\/v1$/);
      expect(environment.apiUrl).not.toContain('localhost');
      expect(environment.apiUrl).not.toBe('/api/v1');
      expect(environment.useSse).toBeTrue();
    });
  }

  it('enables diagnostics only for the explicit diagnostic build', () => {
    expect(production.enableClientHttpDiagnostics).toBeFalse();
    expect(staging.enableClientHttpDiagnostics).toBeTrue();
    expect(diagnostic.enableClientHttpDiagnostics).toBeTrue();
    expect(diagnostic.apiUrl).toBe(production.apiUrl);
  });
});
