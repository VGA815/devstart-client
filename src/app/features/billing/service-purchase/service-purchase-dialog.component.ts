import {
  Component, ChangeDetectionStrategy, ElementRef, HostListener, effect, inject, viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import {
  SERVICE_TARGET_LABELS,
  SERVICE_TYPE_DESCRIPTIONS,
  SERVICE_TYPE_LABELS,
  ServiceCatalogItem,
  ServiceOrder,
  ServiceTarget,
  ServiceType,
} from '../../../shared/models/service-order.model';
import { ServicePurchaseFacade, TargetRow } from './service-purchase.facade';

/**
 * Диалог покупки разовой услуги (SC-49). Монтируется один раз в оболочке приложения и
 * открывается фасадом из любой точки входа: со страницы планов, из скоринга чужого стартапа,
 * из шапки «Моих стартапов» и со страницы заказов.
 *
 * Шаги (лишние пропускаются, если точка входа уже знает ответ):
 * услуга → объект → подтверждение → редирект на ЮKassa.
 */
@Component({
  selector: 'app-service-purchase-dialog',
  standalone: true,
  imports: [RouterLink, AvatarComponent, SkeletonComponent],
  templateUrl: './service-purchase-dialog.component.html',
  styleUrl: './service-purchase-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicePurchaseDialogComponent {
  protected readonly facade = inject(ServicePurchaseFacade);

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    // Фон под модалкой не должен прокручиваться, а фокус обязан войти внутрь диалога:
    // приложение zoneless, поэтому побочный эффект вешаем на сигнал открытия, а не на клик.
    effect(onCleanup => {
      if (!this.facade.isOpen()) return;

      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const focusTarget = this.dialog()?.nativeElement;
      queueMicrotask(() => focusTarget?.focus());

      onCleanup(() => { document.body.style.overflow = previous; });
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.facade.isOpen()) this.facade.close();
  }

  /**
   * Фокус не должен уходить за пределы модалки: Tab с последнего элемента возвращается на первый.
   * Диалог рисуется в конце DOM, но соседние страницы остаются доступными скринридеру без этого.
   */
  @HostListener('document:keydown.tab', ['$event'])
  protected onTab(event: KeyboardEvent): void {
    const root = this.dialog()?.nativeElement;
    if (!this.facade.isOpen() || !root) return;

    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === root)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected serviceTitle(serviceType: ServiceType): string {
    return SERVICE_TYPE_LABELS[serviceType];
  }

  protected serviceDesc(serviceType: ServiceType): string {
    return SERVICE_TYPE_DESCRIPTIONS[serviceType];
  }

  protected targetLabel(target: ServiceTarget): string {
    return SERVICE_TARGET_LABELS[target.kind];
  }

  /** Заголовок шага выбора объекта: «Для какого проекта» / «Для какой сделки». */
  protected targetStepTitle(item: ServiceCatalogItem): string {
    return item.targetKind === 'Deal' ? 'Для какой сделки' : 'Для какого проекта';
  }

  protected price(item: ServiceCatalogItem): string {
    const amount = new Intl.NumberFormat('ru-RU').format(item.price);
    return `${amount} ${item.currency === 'RUB' ? '₽' : item.currency}`;
  }

  /** Срок доступа в человекочитаемом виде; 0 в каталоге означает бессрочно. */
  protected access(item: ServiceCatalogItem): string {
    return item.accessDays > 0 ? `${item.accessDays} дн.` : 'Бессрочно';
  }

  /** Подпись уже оплаченного доступа в строке списка. */
  protected accessUntil(order: ServiceOrder): string {
    if (!order.expiresAt) return 'Куплено';
    return `До ${new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    }).format(new Date(order.expiresAt))}`;
  }

  protected rowDisabled(row: TargetRow): boolean {
    return !!row.access || row.target.inactive;
  }

  protected trackRow = (_: number, row: TargetRow): string => row.target.id;
}
