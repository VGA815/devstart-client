import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './core/layout/nav/nav.component';
import { FooterComponent } from './core/layout/footer/footer.component';
import { AuthService } from './core/auth/auth.service';
import { UserPreferencesService } from './core/preferences/user-preferences.service';
import { ServicePurchaseDialogComponent } from './features/billing/service-purchase/service-purchase-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent, FooterComponent, ServicePurchaseDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly auth  = inject(AuthService);
  private readonly prefs = inject(UserPreferencesService);

  ngOnInit(): void {
    this.prefs.applyStoredTheme();

    if (this.auth.getAccessToken() && !this.auth.isAuthenticated()) {
      this.auth.loadCurrentUser().subscribe({
        error: () => this.auth.logout(),
      });
    }
  }
}
