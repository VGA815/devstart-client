import { DEFAULT_THEME, normalizeTheme, resolveTheme } from './theme.constants';
import { ThemePreference } from '../../shared/models/user-preference.model';

// Дословная копия инлайн-скрипта из src/index.html. Скрипт не может импортировать
// theme.constants.ts (index.html копируется, а не шаблонизируется), поэтому логика
// продублирована — а этот тест доказывает, что копия ведёт себя идентично оригиналу.
// ПРАВИТЕ ВМЕСТЕ С index.html.
const BOOTSTRAP_SNIPPET = `
  (function () {
    var d = document.documentElement;
    try {
      var raw = localStorage.getItem('devstart_theme');
      var pref = (raw === 'Dark' || raw === 'Light' || raw === 'System') ? raw : 'System';
      var eff = pref === 'System'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : (pref === 'Light' ? 'light' : 'dark');
      d.setAttribute('data-theme', eff);
      d.style.colorScheme = eff;
    } catch (e) {
      d.setAttribute('data-theme', 'dark');
    }
  })();
`;

/** Runs the snippet against a stubbed environment and returns what it would paint. */
function runBootstrap(stored: string | null, systemPrefersLight: boolean): string {
  const documentElement = {
    style: {} as { colorScheme?: string },
    attrs: {} as Record<string, string>,
    setAttribute(name: string, value: string) { this.attrs[name] = value; },
  };
  const scope = {
    document: { documentElement },
    localStorage: { getItem: (_: string) => stored },
    window: { matchMedia: (_: string) => ({ matches: systemPrefersLight }) },
  };

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('document', 'localStorage', 'window', BOOTSTRAP_SNIPPET)(
    scope.document, scope.localStorage, scope.window,
  );

  return documentElement.attrs['data-theme'];
}

describe('index.html theme bootstrap', () => {
  const stored: (string | null)[] = ['Dark', 'Light', 'System', null, 'nonsense'];

  for (const raw of stored) {
    for (const systemLight of [false, true]) {
      it(`matches theme.constants.ts for stored=${raw} systemLight=${systemLight}`, () => {
        const expected = resolveTheme(normalizeTheme(raw), systemLight);
        expect(runBootstrap(raw, systemLight)).toBe(expected);
      });
    }
  }

  it('uses the same storage key as the service', () => {
    expect(BOOTSTRAP_SNIPPET).toContain(`'devstart_theme'`);
  });

  it('shares the default with theme.constants.ts', () => {
    // The snippet hardcodes its fallback; if DEFAULT_THEME ever changes, the
    // snippet must change with it.
    const fallback: ThemePreference = 'System';
    expect(DEFAULT_THEME).toBe(fallback);
    expect(BOOTSTRAP_SNIPPET).toContain(`: '${fallback}'`);
  });

  it('falls back to dark when storage throws', () => {
    const documentElement = {
      style: {} as { colorScheme?: string },
      attrs: {} as Record<string, string>,
      setAttribute(name: string, value: string) { this.attrs[name] = value; },
    };
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('document', 'localStorage', 'window', BOOTSTRAP_SNIPPET)(
      { documentElement },
      { getItem: () => { throw new Error('storage disabled'); } },
      { matchMedia: () => ({ matches: true }) },
    );

    expect(documentElement.attrs['data-theme']).toBe('dark');
  });
});
