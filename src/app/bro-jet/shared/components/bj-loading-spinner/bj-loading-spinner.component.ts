import { Component } from '@angular/core';

@Component({
  selector: 'app-bj-loading-spinner',
  standalone: true,
  template: `
    <div class="flex-1 flex items-center justify-center py-20">
      <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  `,
})
export class BjLoadingSpinnerComponent {}
