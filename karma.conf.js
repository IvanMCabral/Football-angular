// Karma configuration — LIVE-MATCH-F3-UI-LIVE F3.4 setup.
// Generated to match the Angular 21 project's @angular-devkit/build-angular
// builder. Karma drives ChromeHeadless for CI-style runs; the npm test
// command in package.json passes --watch=false --browsers=ChromeHeadless
// for one-shot runs.
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // Random order to flush out inter-spec coupling.
        random: true
      },
      clearContext: false
    },
    jasmineHtmlReporter: { suppressAll: true },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    // The npm test command in package.json overrides these via CLI flags
    // (--watch=false --browsers=ChromeHeadless). Defaults here are for
    // interactive `ng test` runs.
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--headless', '--remote-debugging-port=9222']
      }
    },
    singleRun: false,
    restartOnFileChange: true
  });
};
