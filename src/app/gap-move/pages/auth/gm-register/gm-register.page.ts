import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { GmAuthService } from '../../../core/services/gm-auth.service';
import { GmToastService } from '../../../core/services/gm-toast.service';

@Component({
  selector: 'app-gm-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gm-register.page.html',
})
export class GmRegisterPage {
  fullName = '';
  phone = '';
  email = '';
  password = '';

  constructor(
    private authService: GmAuthService,
    private toastService: GmToastService,
    private router: Router,
  ) {}

  register(): void {
    this.authService
      .register({ fullName: this.fullName || 'GapMove Customer', phone: this.phone, email: this.email, password: this.password || '123456' })
      .subscribe(() => {
        this.toastService.success('Tao tai khoan thanh cong');
        this.router.navigateByUrl('/gap-move/home');
      });
  }
}
