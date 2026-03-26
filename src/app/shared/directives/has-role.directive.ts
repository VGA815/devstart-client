import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../models/user.model';

@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective implements OnInit {
  @Input() hasRole!: UserRole | UserRole[];

  private readonly auth = inject(AuthService);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);

  ngOnInit(): void {
    const roles = Array.isArray(this.hasRole) ? this.hasRole : [this.hasRole];
    const userRole = this.auth.role();
    const allowed = userRole === 'Admin' || (userRole !== null && roles.includes(userRole));

    if (allowed) {
      this.vcr.createEmbeddedView(this.tpl);
    } else {
      this.vcr.clear();
    }
  }
}
