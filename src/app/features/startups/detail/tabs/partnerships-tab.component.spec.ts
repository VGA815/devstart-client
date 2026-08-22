import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { PartnershipsTabComponent } from './partnerships-tab.component';
import { StartupDetailFacade } from '../startup-detail.facade';
import { PartnershipKind, StartupPartnership } from '../../../../shared/models/startup-partnership.model';

function partnership(overrides: Partial<StartupPartnership> = {}): StartupPartnership {
  return {
    id: 'p1',
    startupId: 's1',
    partnerName: 'Big Retailer',
    website: 'https://retailer.example',
    kind: PartnershipKind.Distribution,
    description: 'Продают наш продукт в 40 точках.',
    isWorkedOut: true,
    createdAt: '2026-08-22T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
    ...overrides,
  };
}

describe('PartnershipsTabComponent', () => {
  let fixture: ComponentFixture<PartnershipsTabComponent>;

  const partnerships = signal<StartupPartnership[]>([]);
  const isFounderOrAdmin = signal(true);

  const facadeStub = {
    partnerships,
    partnershipsLoading: signal(false),
    deletingPartnershipId: signal<string | null>(null),
    isFounderOrAdmin,
    isAuthenticated: signal(true),
    savePartnership: jasmine.createSpy('savePartnership').and.returnValue(of('new-id')),
    deletePartnership: jasmine.createSpy('deletePartnership'),
  };

  beforeEach(async () => {
    partnerships.set([]);
    isFounderOrAdmin.set(true);
    facadeStub.savePartnership.calls.reset();
    facadeStub.deletePartnership.calls.reset();

    await TestBed.configureTestingModule({
      imports: [PartnershipsTabComponent],
      providers: [{ provide: StartupDetailFacade, useValue: facadeStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(PartnershipsTabComponent);
  });

  it('показывает пустое состояние, когда записей нет', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.sd-partnership-card').length).toBe(0);
  });

  it('рендерит все записи, включая незачтённые', () => {
    partnerships.set([
      partnership({ id: 'p1' }),
      partnership({ id: 'p2', description: null, isWorkedOut: false }),
    ]);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.sd-partnership-card');
    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.sd-partnership-card__counted').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.sd-partnership-card__pending').length).toBe(1);
  });

  /**
   * Лесенка на фронте должна показывать ровно то, что считает бэк: заполненных слотов столько,
   * сколько записей он пометил `isWorkedOut`, и четвёртая запись прогресс не двигает.
   */
  it('заполняет слоты лесенки по числу зачтённых записей и насыщается на трёх', () => {
    partnerships.set([
      partnership({ id: 'p1' }),
      partnership({ id: 'p2' }),
      partnership({ id: 'p3', description: null, isWorkedOut: false }),
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.workedOutCount()).toBe(2);
    expect(fixture.componentInstance.remainingToSaturation()).toBe(1);
    expect(
      fixture.nativeElement.querySelectorAll('.sd-partnerships__progress-slot--filled').length
    ).toBe(2);

    partnerships.set([
      partnership({ id: 'p1' }), partnership({ id: 'p2' }),
      partnership({ id: 'p3' }), partnership({ id: 'p4' }),
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.workedOutCount()).toBe(4);
    expect(fixture.componentInstance.remainingToSaturation()).toBe(0);
    expect(
      fixture.nativeElement.querySelectorAll('.sd-partnerships__progress-slot--filled').length
    ).toBe(3);
  });

  it('не показывает кнопки управления читателю без прав', () => {
    isFounderOrAdmin.set(false);
    partnerships.set([partnership()]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sd-partnerships-toolbar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sd-partnership-card__actions')).toBeNull();
  });

  it('не отправляет форму без сайта — сайт обязателен и на бэке', () => {
    fixture.componentInstance.openNewForm();
    fixture.componentInstance.formName.set('Партнёр');
    fixture.componentInstance.save();

    expect(facadeStub.savePartnership).not.toHaveBeenCalled();
    expect(fixture.componentInstance.formError()).toContain('сайт');
  });

  it('отклоняет относительную ссылку до запроса', () => {
    fixture.componentInstance.openNewForm();
    fixture.componentInstance.formName.set('Партнёр');
    fixture.componentInstance.formWebsite.set('retailer.example');
    fixture.componentInstance.save();

    expect(facadeStub.savePartnership).not.toHaveBeenCalled();
  });

  it('отправляет описание как undefined, когда поле пустое', () => {
    fixture.componentInstance.openNewForm();
    fixture.componentInstance.formName.set('Партнёр');
    fixture.componentInstance.formWebsite.set('https://partner.example');
    fixture.componentInstance.formDesc.set('   ');
    fixture.componentInstance.save();

    expect(facadeStub.savePartnership).toHaveBeenCalledWith(
      jasmine.objectContaining({
        partner_name: 'Партнёр',
        website: 'https://partner.example',
        description: undefined,
      }),
      null
    );
  });

  it('передаёт id редактируемой записи при сохранении правки', () => {
    fixture.componentInstance.openEditForm(partnership({ id: 'p9' }));
    fixture.componentInstance.save();

    expect(facadeStub.savePartnership).toHaveBeenCalledWith(jasmine.any(Object), 'p9');
  });

  it('переводит код ошибки бэка в читаемый текст', () => {
    facadeStub.savePartnership.and.returnValue({
      subscribe: ({ error }: { error: (e: unknown) => void }) =>
        error({ error: { title: 'StartupPartnerships.DuplicateDomain' } }),
    });

    fixture.componentInstance.openNewForm();
    fixture.componentInstance.formName.set('Партнёр');
    fixture.componentInstance.formWebsite.set('https://partner.example');
    fixture.componentInstance.save();

    expect(fixture.componentInstance.formError()).toBe('Партнёр с этим доменом уже добавлен');
    expect(fixture.componentInstance.formSaving()).toBeFalse();

    facadeStub.savePartnership.and.returnValue(of('new-id'));
  });
});
