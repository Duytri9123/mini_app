import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gm-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center gap-3 py-8 text-sm text-slate-500">
      <span class="h-5 w-5 animate-spin rounded-full border-2 border-[#008c95]/20 border-t-[#008c95]"></span>
      <span>{{ label }}</span>
    </div>
  `,
})
export class GmLoadingSpinnerComponent {
  @Input() label = 'Dang tai...';
}
