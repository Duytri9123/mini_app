import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-bj-otp-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bj-otp-form.component.html',
})
export class BjOtpFormComponent {
  @Input() otpForm!: FormGroup;
  @Input() phone = '';
  @Input() countdown = 120;
  @Input() countdownDisplay = '2:00';
  @Input() canResend = false;
  @Input() loading = false;
  @Input() errorMsg = '';
  @Input() submitLabel = 'Xác nhận';

  @Output() formSubmit = new EventEmitter<void>();
  @Output() resend = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
}
