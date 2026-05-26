import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-gm-empty-state',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './gm-empty-state.component.html',
})
export class GmEmptyStateComponent {
  @Input() icon = 'cube-outline';
  @Input() title = '';
  @Input() description = '';
  @Input() ctaLabel?: string;
  @Output() ctaClick = new EventEmitter<void>();
}
