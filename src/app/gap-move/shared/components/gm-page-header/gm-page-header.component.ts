import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gm-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gm-page-header.component.html',
})
export class GmPageHeaderComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() description = '';
}
