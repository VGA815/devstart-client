import {
  Component, ChangeDetectionStrategy, inject, OnInit, signal, Input,
} from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../core/auth/auth.service';
import { InviteTokenService } from '../startups/invite-token.service';

type InviteState = 'loading' | 'valid' | 'invalid' | 'joining' | 'joined' | 'error';

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './invite.component.html',
  styleUrl: './invite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteComponent implements OnInit {
  @Input() tokenId!: string;

  private readonly inviteSvc = inject(InviteTokenService);
  private readonly router    = inject(Router);
  protected readonly auth    = inject(AuthService);

  readonly state           = signal<InviteState>('loading');
  readonly joinedStartupId = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Приглашение — DevStart');
  }

  ngOnInit(): void {
    if (!this.tokenId) { this.state.set('invalid'); return; }

    this.inviteSvc.validateToken(this.tokenId).subscribe({
      next: isValid => this.state.set(isValid ? 'valid' : 'invalid'),
      error: ()      => this.state.set('invalid'),
    });
  }

  accept(): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/invite/${this.tokenId}` },
      });
      return;
    }
    this.state.set('joining');
    this.inviteSvc.joinByToken(this.tokenId).subscribe({
      next: startupId => {
        this.joinedStartupId.set(startupId);
        this.state.set('joined');
      },
      error: () => this.state.set('error'),
    });
  }
}
