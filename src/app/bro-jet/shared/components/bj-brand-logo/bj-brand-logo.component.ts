import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-bj-brand-logo',
  standalone: true,
  template: `
    <div class="text-center">
      <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <span class="text-white text-2xl font-bold">BJ</span>
      </div>
      <h1 class="text-2xl font-bold text-gray-900">BRO JET AUTO SPA</h1>
      <p class="text-sm text-gray-500 mt-1">{{ tagline }}</p>
    </div>
  `,
})
export class BjBrandLogoComponent {
  @Input() tagline = 'Rửa xe thông minh – Tiện lợi mọi lúc';
}
