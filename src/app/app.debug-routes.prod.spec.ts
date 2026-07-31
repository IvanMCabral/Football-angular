import { buildDebugRoutes } from './app.debug-routes.prod';

describe('production debug routes', () => {
  it('excludes debug tooling from production route definitions', () => {
    expect(buildDebugRoutes(true, [])).toEqual([]);
  });
});
