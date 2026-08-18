import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import {
  IpKind,
  LegalEntityState,
  PatentOwnership,
  PatentProtectionStatus,
  PatentResolutionState,
  StartupPatent,
  StartupPatentSuggestion,
} from '../../../../shared/models/startup-patent.model';
import { StartupDetailFacade } from '../startup-detail.facade';

/** Человеческий текст по стабильному коду Problem Details (title), см. docs/api.md. */
const PATENT_ERRORS: Record<string, string> = {
  'StartupPatents.DuplicateNumber': 'Такой номер уже добавлен',
  'StartupPatents.LimitReached':    'Достигнут лимит записей ИС',
  'StartupPatents.InvalidNumber':   'Номер не соответствует выбранному виду объекта',
  'StartupPatents.Unauthorized':    'Недостаточно прав для изменения записей',
};

/**
 * Подписи видов объектов и ожидаемый формат номера. Формат зеркалит серверную проверку
 * (`StartupPatent.IsNumberWellFormed`): ошибка формата — это опечатка на вводе, а не «не найдено
 * в реестре», и путать их нельзя.
 */
const KINDS: { kind: IpKind; label: string; hint: string; placeholder: string }[] = [
  { kind: IpKind.Invention,        label: 'Изобретение',          hint: '7 цифр',  placeholder: '2731234' },
  { kind: IpKind.UtilityModel,     label: 'Полезная модель',      hint: '5–7 цифр', placeholder: '213456' },
  { kind: IpKind.IndustrialDesign, label: 'Промышленный образец', hint: '5–7 цифр', placeholder: '132456' },
  { kind: IpKind.ComputerProgram,  label: 'Программа для ЭВМ',    hint: '10 цифр: год + порядковый', placeholder: '2023612345' },
  { kind: IpKind.Database,         label: 'База данных',          hint: '10 цифр: год + порядковый', placeholder: '2023621234' },
  { kind: IpKind.Trademark,        label: 'Товарный знак',        hint: '5–7 цифр', placeholder: '812345' },
];

@Component({
  selector: 'app-patents-tab',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './patents-tab.component.html',
  styleUrl: './patents-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatentsTabComponent {
  protected readonly facade = inject(StartupDetailFacade);

  readonly kinds = KINDS;

  readonly showForm    = signal(false);
  readonly formKind    = signal<IpKind>(IpKind.ComputerProgram);
  readonly formNumber  = signal('');
  readonly formSaving  = signal(false);
  readonly formError   = signal('');
  readonly showSuggestions = signal(false);

  openForm(prefillKind?: IpKind, prefillNumber?: string): void {
    this.formKind.set(prefillKind ?? IpKind.ComputerProgram);
    this.formNumber.set(prefillNumber ?? '');
    this.formError.set('');
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.formError.set('');
  }

  save(): void {
    const number = this.formNumber().trim();
    if (!number) {
      this.formError.set('Укажите номер');
      return;
    }

    this.formSaving.set(true);
    this.formError.set('');

    this.facade.savePatent(this.formKind(), number).subscribe({
      next: () => {
        this.formSaving.set(false);
        this.showForm.set(false);
        this.formNumber.set('');
      },
      error: (err: HttpErrorResponse) => {
        this.formSaving.set(false);
        this.formError.set(PATENT_ERRORS[err?.error?.title] ?? 'Не удалось сохранить. Попробуйте снова.');
      },
    });
  }

  remove(p: StartupPatent): void {
    this.facade.deletePatent(p.id);
  }

  toggleSuggestions(): void {
    const next = !this.showSuggestions();
    this.showSuggestions.set(next);
    if (next && !this.facade.patentSuggestions()) {
      this.facade.loadPatentSuggestions();
    }
  }

  addFromSuggestion(s: StartupPatentSuggestion): void {
    this.openForm(s.kind, s.number);
  }

  kindLabel(kind: IpKind): string {
    return KINDS.find(k => k.kind === kind)?.label ?? `вид ${kind}`;
  }

  numberHint(kind: IpKind): string {
    return KINDS.find(k => k.kind === kind)?.hint ?? '';
  }

  numberPlaceholder(kind: IpKind): string {
    return KINDS.find(k => k.kind === kind)?.placeholder ?? '';
  }

  onKindChange(value: string): void {
    this.formKind.set(Number(value) as IpKind);
  }

  /**
   * Подпись состояния сверки. Три состояния, и все три показываются: «не найдена» говорит о записи,
   * «сверка недоступна» — о платформе, и склеивать их нельзя. Несовпадения не прячем — видимый
   * список несовпадений и есть защита от тактики «ввести двадцать номеров, показать три попавших».
   */
  stateLabel(p: StartupPatent): string {
    switch (p.state) {
      case PatentResolutionState.Found:              return 'найдена в реестре';
      case PatentResolutionState.NotFoundInRegistry: return 'в реестре не найдена';
      default:                                       return 'сверка недоступна';
    }
  }

  stateKind(p: StartupPatent): string {
    switch (p.state) {
      case PatentResolutionState.Found:              return 'found';
      case PatentResolutionState.NotFoundInRegistry: return 'missing';
      default:                                       return 'unknown';
    }
  }

  protectionLabel(status: PatentProtectionStatus | null): string {
    switch (status) {
      case PatentProtectionStatus.Active:          return 'охрана действует';
      case PatentProtectionStatus.Terminated:      return 'охрана прекращена';
      case PatentProtectionStatus.EarlyTerminated: return 'охрана прекращена досрочно';
      default:                                     return 'статус охраны неизвестен';
    }
  }

  /**
   * Формулировки сравнения ИНН. Слово «подтверждено» здесь неуместно: реестр говорит, кто
   * правообладатель, ЕГРЮЛ — что юрлицо существует, и ни то, ни другое не говорит, что стартап этим
   * юрлицом управляет.
   */
  ownershipLabel(p: StartupPatent): string | null {
    switch (p.ownership) {
      case PatentOwnership.MatchesDeclaredInn:
        return 'ИНН правообладателя совпадает с заявленным стартапом';
      case PatentOwnership.DiffersFromDeclaredInn:
        return 'ИНН правообладателя отличается от заявленного стартапом';
      default:
        return null;
    }
  }

  ownershipKind(p: StartupPatent): string {
    switch (p.ownership) {
      case PatentOwnership.MatchesDeclaredInn:     return 'match';
      case PatentOwnership.DiffersFromDeclaredInn: return 'differs';
      default:                                     return 'none';
    }
  }

  /** Справка по ЕГРЮЛ: «недоступна» — про платформу, а не про стартап. */
  legalEntityLine(): string | null {
    const patents = this.facade.patents();
    const entity = patents?.legalEntity;
    if (!patents?.declaredInn) return null;

    if (!entity || entity.state === LegalEntityState.Unavailable) {
      return `стартап заявил ИНН ${patents.declaredInn}; проверка по ЕГРЮЛ недоступна`;
    }
    if (entity.state === LegalEntityState.NotFound) {
      return `стартап заявил ИНН ${patents.declaredInn}; в ЕГРЮЛ такой записи нет`;
    }

    const status = entity.isActive === false ? 'недействующее по ЕГРЮЛ' : 'действующее по ЕГРЮЛ';
    return `стартап заявил ИНН ${patents.declaredInn} (${entity.name ?? 'без наименования'}, ${status})`;
  }

  /** Приглашение указать номера живёт здесь, а не в подсказках скоринга: у него нулевой вклад в балл. */
  showInvitation(): boolean {
    const patents = this.facade.patents();
    return !!patents && patents.hasPatentsDeclared && patents.records.length === 0;
  }
}
