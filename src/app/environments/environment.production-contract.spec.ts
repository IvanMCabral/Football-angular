import { environment as production } from './environment.prod';
import { environment as staging } from './environment.staging';

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
});
