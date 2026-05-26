import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GmAuthService } from '../../core/services/gm-auth.service';

@Component({
  selector: 'app-gm-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-profile.page.html',
})
export class GmProfilePage {
  user$ = this.authService.currentUser$;

  constructor(
    private authService: GmAuthService,
    private router: Router,
  ) {}

  logout(): void {
    this.authService.logout().subscribe(() => this.router.navigateByUrl('/gap-move/login'));
  }
}
