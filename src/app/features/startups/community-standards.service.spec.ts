import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CommunityStandardsService } from './community-standards.service';
import { environment } from '../../../environments/environment';
import { CommunityStandards, CommunityDocument } from '../../shared/models/community-standards.model';
import {
  CommunityStandardsDto, mapCommunityStandardsDto, mapCommunityStandardsLevel,
} from '../../shared/models/dto/community-standards.dto';

const STARTUP_ID = '11111111-1111-1111-1111-111111111111';

describe('mapCommunityStandardsDto', () => {
  it('декодирует числовые enum-ы уровня и типа документа', () => {
    const dto: CommunityStandardsDto = {
      completedCount: 8,
      totalCount: 12,
      percent: 67,
      level: 1,
      checks: [
        { key: 'description', isSatisfied: true, isDocument: false, documentType: null, documentId: null },
        { key: 'legal', isSatisfied: true, isDocument: true, documentType: 4, documentId: 'doc-1' },
      ],
      evaluatedAt: '2026-07-24T10:00:00Z',
    };

    const result = mapCommunityStandardsDto(dto);

    expect(result.level).toBe('Developing');
    expect(result.checks[0].documentType).toBeNull();
    expect(result.checks[1].documentType).toBe('Legal');
    expect(result.checks[1].documentId).toBe('doc-1');
  });

  it('нормализует null-чек-лист в пустой массив', () => {
    const dto: CommunityStandardsDto = {
      completedCount: 0, totalCount: 0, percent: 0, level: 0,
      checks: null, evaluatedAt: '2026-07-24T10:00:00Z',
    };

    expect(mapCommunityStandardsDto(dto).checks).toEqual([]);
  });

  it('трактует отсутствующий уровень как Incomplete', () => {
    expect(mapCommunityStandardsLevel(null)).toBe('Incomplete');
    expect(mapCommunityStandardsLevel(undefined)).toBe('Incomplete');
    expect(mapCommunityStandardsLevel(2)).toBe('Complete');
  });
});

describe('CommunityStandardsService', () => {
  let service: CommunityStandardsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CommunityStandardsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CommunityStandardsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getStandards маппит ответ в модель', () => {
    let received: CommunityStandards | undefined;
    service.getStandards(STARTUP_ID).subscribe(r => received = r);

    const req = httpMock.expectOne(`${environment.apiUrl}/startups/${STARTUP_ID}/community`);
    expect(req.request.method).toBe('GET');
    req.flush({
      completedCount: 12, totalCount: 12, percent: 100, level: 2,
      checks: [], evaluatedAt: '2026-07-24T10:00:00Z',
    });

    expect(received?.level).toBe('Complete');
    expect(received?.percent).toBe(100);
  });

  it('getDocument подставляет числовой тип документа в URL', () => {
    let received: CommunityDocument | undefined;
    service.getDocument(STARTUP_ID, 'SecurityPolicy').subscribe(r => received = r);

    const req = httpMock.expectOne(
      `${environment.apiUrl}/startups/${STARTUP_ID}/community/documents/3`
    );
    req.flush({
      id: 'doc-3', startupId: STARTUP_ID, type: 3,
      title: 'Политика безопасности', content: '# Заголовок',
      createdAt: '2026-07-01T10:00:00Z', updatedAt: '2026-07-20T10:00:00Z',
    });

    expect(received?.type).toBe('SecurityPolicy');
    expect(received?.content).toBe('# Заголовок');
  });

  it('upsertDocument шлёт PUT с title и content', () => {
    service.upsertDocument(STARTUP_ID, 'CodeOfConduct', {
      title: 'Кодекс поведения', content: 'Текст',
    }).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/startups/${STARTUP_ID}/community/documents/0`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ title: 'Кодекс поведения', content: 'Текст' });
    req.flush('doc-0');
  });

  it('deleteDocument снимает документ с публикации', () => {
    service.deleteDocument(STARTUP_ID, 'Contributing').subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/startups/${STARTUP_ID}/community/documents/1`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getTemplates маппит тип каждого шаблона', () => {
    service.getTemplates().subscribe(list => {
      expect(list.map(t => t.type)).toEqual(['CodeOfConduct', 'Legal']);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/community-standards/templates`);
    req.flush([
      { type: 0, title: 'Кодекс поведения', content: '...' },
      { type: 4, title: 'Правовая информация', content: '...' },
    ]);
  });
});
