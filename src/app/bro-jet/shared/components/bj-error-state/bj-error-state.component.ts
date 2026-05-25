import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bj-error-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-error-state.component.html',
})
export class BjErrorStateComponent {
  @Input() message = 'Đã xảy ra lỗi. Vui lòng thử lại.';
  @Input() backLabel = 'Quay lại';
  @Output() backClick = new EventEmitter<void>();
}
