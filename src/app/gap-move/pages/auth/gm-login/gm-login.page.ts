import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { GmAuthService } from '../../../core/services/gm-auth.service';
import { GmToastService } from '../../../core/services/gm-toast.service';

@Component({
  selector: 'app-gm-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonicModule],
  templateUrl: './gm-login.page.html',
})
export class GmLoginPage {
  phoneOrEmail = 'customer@gapmove.vn';
  password = '123456';
  isSubmitting = false;

  constructor(
    private authService: GmAuthService,
    private toastService: GmToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  login(): void {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.authService.loginWithCredentials({ phoneOrEmail: this.phoneOrEmail, password: this.password }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastService.success('Dang nhap thanh cong');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/gap-move/home';
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        this.isSubmitting = false;
        this.toastService.error('Vui long nhap du thong tin dang nhap');
      },
    });
  }
}
