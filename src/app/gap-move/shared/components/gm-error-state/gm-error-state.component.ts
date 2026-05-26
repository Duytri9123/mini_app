import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-gm-error-state',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './gm-error-state.component.html',
})
export class GmErrorStateComponent {
  @Input() title = 'Khong tai duoc du lieu';
  @Input() description = 'Vui long thu lai sau.';
  @Input() retryLabel = 'Thu lai';
  @Output() retry = new EventEmitter<void>();
}
