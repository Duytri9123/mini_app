import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bj-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-empty-state.component.html',
})
export class BjEmptyStateComponent {
  @Input() icon: string = '';
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() ctaLabel?: string;

  @Output() ctaClick = new EventEmitter<void>();

  onCtaClick(): void {
    this.ctaClick.emit();
  }
}
