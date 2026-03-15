import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './core/layout/nav/nav.component';
import { FooterComponent } from './core/layout/footer/footer.component';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    if (this.auth.getAccessToken() && !this.auth.isAuthenticated()) {
      this.auth.loadCurrentUser().subscribe({
        error: () => this.auth.logout(),
      });
    }
  }
}
