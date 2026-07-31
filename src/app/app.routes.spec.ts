import { buildDebugRoutes } from './app.debug-routes';

describe('app routes', () => {
  it('includes debug harness route when debug routes are enabled', () => {
    const routes = buildDebugRoutes(true, []);

    expect(routes.some((route) => route.path === 'debug/test-harness')).toBeTrue();
  });

  it('excludes debug harness route when debug routes are disabled', () => {
    const routes = buildDebugRoutes(false, []);

    expect(routes.some((route) => route.path === 'debug/test-harness')).toBeFalse();
  });
});
