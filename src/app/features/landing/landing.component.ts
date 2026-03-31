import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { AuthService } from '../../core/auth/auth.service';
import { StartupCatalogFacade } from '../startups/catalog/startup-catalog.facade';
import { TagComponent } from '../../shared/components/tag/tag.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { getStageColor } from '../../shared/utils/startup.utils';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, TagComponent, SkeletonComponent, AvatarComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly catalog = inject(StartupCatalogFacade);
  private readonly titleSvc = inject(Title);
  private readonly metaSvc = inject(Meta);

  readonly skeletons = Array(5);

  readonly features = [
    {
      icon: '🗂',
      title: 'Профиль стартапа',
      desc: 'Карточка с описанием, метриками, дорожной картой и командой. Загружайте pitch deck прямо на платформу.',
    },
    {
      icon: '🔍',
      title: 'Умный поиск',
      desc: 'Фильтрация по стадии, отрасли, географии и чеку. Инвесторы найдут именно ваш проект.',
    },
    {
      icon: '🤝',
      title: 'Заявки на сотрудничество',
      desc: 'Отправляйте и принимайте заявки от инвесторов и менторов. Всё в одном месте.',
    },
    {
      icon: '📊',
      title: 'Ключевые метрики',
      desc: 'MRR, DAU, runway — публикуйте метрики, которые важны инвесторам. Прозрачность — доверие.',
    },
  ];

  readonly stats = [
    { value: '1 248', label: 'Стартапов' },
    { value: '374',   label: 'Инвесторов' },
    { value: '89',    label: 'Экспертов' },
    { value: '₽ 2.1B', label: 'Привлечено' },
  ];

  ngOnInit(): void {
    this.titleSvc.setTitle('DevStart — Площадка для стартапов');
    this.metaSvc.updateTag({ name: 'description', content: 'DevStart соединяет основателей с инвесторами и менторами.' });
    this.catalog.load({ page: 1, pageSize: 5 });
  }

  protected readonly getStageColor = getStageColor;
}
