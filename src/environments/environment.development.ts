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
};
