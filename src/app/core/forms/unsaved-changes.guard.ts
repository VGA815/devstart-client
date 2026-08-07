import { CanDeactivateFn } from '@angular/router';

/**
 * Компонент с формой, уход с которой может стоить пользователю введённых данных.
 * Реализуйте `hasUnsavedChanges()`; сообщение можно переопределить через `unsavedChangesMessage`.
 */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  unsavedChangesMessage?: string;
}

const DEFAULT_MESSAGE =
  'Изменения не сохранены. Уйти со страницы и потерять их?';

/**
 * Спрашивает подтверждение при уходе с формы с несохранёнными изменениями.
 * Работает только для внутренней навигации Angular — закрытие вкладки перехватывает
 * отдельный слушатель `beforeunload` в самом компоненте (браузер не даёт кастомный текст).
 */
export const UnsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = component => {
  if (!component?.hasUnsavedChanges?.()) {
    return true;
  }
  return confirm(component.unsavedChangesMessage ?? DEFAULT_MESSAGE);
};
