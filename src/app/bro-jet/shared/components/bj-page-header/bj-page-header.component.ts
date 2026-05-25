import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bj-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-page-header.component.html',
})
export class BjPageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Output() backClick = new EventEmitter<void>();
}
