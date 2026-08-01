export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl: 'ws://localhost:8082/connection/websocket',
  // Self-hosted Matomo, same origin. Empty = analytics fully disabled (MatomoService no-ops),
  // which is the default for a plain `ng build`. The prod image overrides both via Dockerfile
  // build args (docker-compose.prod.yml passes MATOMO_URL=/matomo/ and MATOMO_SITE_ID).
  // matomoSiteId is a STRING, not a number: the Dockerfile's sed only matches quoted values.
  matomoUrl: '',
  matomoSiteId: '',
};
