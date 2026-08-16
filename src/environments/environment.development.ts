export const environment = {
  production: false,
  apiUrl: '/api',
  wsUrl: 'ws://localhost:8082/connection/websocket',
  // Empty by default so `ng serve` never requests a tracker that isn't running.
  // To exercise analytics locally: `make up` in the DevStart repo, run the Matomo install wizard
  // at http://localhost:8080/matomo/, then set matomoUrl: 'http://localhost:8080/matomo/'.
  // That is cross-origin from :4200 — config/matomo/common.config.ini.php allows it via
  // cors_domains[]. Keep both keys present: angular.json only swaps this file in the development
  // configuration, so a key missing from environment.ts breaks the production build.
  matomoUrl: '',
  matomoSiteId: '1',
  // Empty so `ng serve` and unit tests never load the SmartCaptcha script. To exercise the real
  // widget locally, paste Yandex's official "always passes" TEST client key here and set the
  // matching test server key as Captcha__ServerKey on the API (plus Captcha__Enabled=true).
  // Keep this key present in both environment files — see the note above.
  captchaSiteKey: '',
};
