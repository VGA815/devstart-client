import { ComponentFixture, DeferBlockState, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { StartupCatalogComponent } from './startup-catalog.component';
import { CATALOG_PAGE_SIZE } from './startup-catalog.store';
import { environment } from '../../../../environments/environment';

function startupDto(i: number) {
  return {
    id: 's' + i, name: 'Стартап ' + i, publicEmail: 'a@b.c',
    shortDescription: null, description: null, url: null,
    isStopped: false, stage: 0, socialMediaLinks: null, location: null,
    billingEmail: null, avatarId: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  };
}

function page(size: number, from = 1) {
  return Array.from({ length: size }, (_, k) => startupDto(from + k));
}

describe('StartupCatalogComponent', () => {
  let fixture: ComponentFixture<StartupCatalogComponent>;
  let http: HttpTestingController;

  const listUrl = (p: number) =>
    `${environment.apiUrl}/startups?page=${p}&pageSize=${CATALOG_PAGE_SIZE}`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartupCatalogComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(StartupCatalogComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function renderFirstPage(size = CATALOG_PAGE_SIZE) {
    fixture.detectChanges();
    http.expectOne(listUrl(1)).flush(page(size));
    fixture.detectChanges();
  }

  function rows(): number {
    return fixture.nativeElement.querySelectorAll('.startup-row').length;
  }

  it('берёт первую страницу каталога размером CATALOG_PAGE_SIZE', () => {
    renderFirstPage();
    expect(rows()).toBe(CATALOG_PAGE_SIZE);
  });

  it('не трогает метрики, пока строка не показалась — это и есть смысл @defer', () => {
    renderFirstPage();

    // Ни одного GET .../metrics: заглушки @placeholder ещё не пересекли вьюпорт.
    http.expectNone(`${environment.apiUrl}/startups/s1/metrics`);
    expect(fixture.nativeElement.querySelectorAll('div.sr-metrics').length).toBe(CATALOG_PAGE_SIZE);
  });

  it('грузит метрики строки, когда её defer-блок дошёл до Complete', async () => {
    renderFirstPage();

    const blocks = await fixture.getDeferBlocks();
    expect(blocks.length).toBe(CATALOG_PAGE_SIZE);

    await blocks[0].render(DeferBlockState.Complete);

    http.expectOne(`${environment.apiUrl}/startups/s1/metrics`).flush([
      { id: 'm1', startupId: 's1', metricType: 6, value: 120000 },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.sr-metric-cell').length).toBe(1);
    // Соседние строки по-прежнему молчат.
    http.expectNone(`${environment.apiUrl}/startups/s2/metrics`);
  });

  it('«Показать ещё» дописывает следующую страницу к списку', () => {
    renderFirstPage();

    fixture.nativeElement.querySelector('.catalog-more button').click();
    http.expectOne(listUrl(2)).flush(page(CATALOG_PAGE_SIZE, CATALOG_PAGE_SIZE + 1));
    fixture.detectChanges();

    expect(rows()).toBe(CATALOG_PAGE_SIZE * 2);
  });

  it('прячет «Показать ещё», когда страница пришла неполной', () => {
    renderFirstPage(CATALOG_PAGE_SIZE - 3);
    expect(fixture.nativeElement.querySelector('.catalog-more')).toBeNull();
  });

  it('прячет «Показать ещё» во время поиска — поиск идёт по уже загруженному', () => {
    renderFirstPage();
    expect(fixture.nativeElement.querySelector('.catalog-more')).not.toBeNull();

    fixture.componentInstance.onSearch('Стартап 3');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.catalog-more')).toBeNull();
    expect(rows()).toBe(1);
  });
});
