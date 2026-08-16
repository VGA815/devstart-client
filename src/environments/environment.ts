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
  // Yandex SmartCaptcha client (site) key — PUBLIC, it is meant to be in the bundle. The server
  // key is a secret and lives only in the API container's Captcha__ServerKey; never put it here.
  // Empty = captcha fully disabled (CaptchaService no-ops, captchaInterceptor passes through),
  // which is the default for a plain `ng build`. The prod image overrides it via the
  // CAPTCHA_SITE_KEY Dockerfile build arg, so it must stay a single-line quoted STRING: the
  // Dockerfile's sed only matches quoted values.
  captchaSiteKey: '',
};
