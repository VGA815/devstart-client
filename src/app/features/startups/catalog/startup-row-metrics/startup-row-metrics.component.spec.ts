import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { StartupRowMetricsComponent } from './startup-row-metrics.component';
import { environment } from '../../../../../environments/environment';

function metricDto(id: string, metricType: number, value: number) {
  return { id, startupId: 's1', metricType, value, createdAt: '2026-01-01T00:00:00Z' };
}

describe('StartupRowMetricsComponent', () => {
  let fixture: ComponentFixture<StartupRowMetricsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartupRowMetricsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(StartupRowMetricsComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function render(startupId: string) {
    fixture.componentRef.setInput('startupId', startupId);
    fixture.detectChanges();
    return http.expectOne(`${environment.apiUrl}/startups/${startupId}/metrics`);
  }

  it('запрашивает метрики того стартапа, который передан во входе', () => {
    const req = render('s1');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('рендерит ячейку на каждую метрику', () => {
    render('s1').flush([metricDto('m1', 6, 120000), metricDto('m2', 1, 4200)]);
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll('.sr-metric-cell');
    expect(cells.length).toBe(2);
  });

  it('показывает не больше четырёх метрик — в строке каталога помещается ровно столько', () => {
    render('s1').flush(
      Array.from({ length: 7 }, (_, i) => metricDto('m' + i, 1, i * 100))
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.sr-metric-cell').length).toBe(4);
  });

  it('на ошибке метрик не ломает строку, а рисует пустоту', () => {
    render('s1').error(new ProgressEvent('network error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.sr-metric-cell').length).toBe(0);
  });
});
