import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal-details',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-details.component.html',
  styleUrl: './legal-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalDetailsComponent {
  private readonly title = inject(Title);

  readonly details = [
    { label: 'Проект', value: 'DevStart' },
    { label: 'ИНН', value: '616127900662' },
    { label: 'Назначение', value: 'Платформа для публикации стартапов и взаимодействия с инвесторами и экспертами' },
    { label: 'Оператор платформы', value: 'Указывается в актуальной редакции пользовательского соглашения' },
    { label: 'Юридически значимые документы', value: 'Политика конфиденциальности, пользовательское соглашение и согласие на обработку персональных данных' },
  ];

  constructor() {
    this.title.setTitle('Юридические данные — DevStart');
  }
}
