import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-gm-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gm-sidebar.component.html',
})
export class GmSidebarComponent {
  @Output() closeSidebar = new EventEmitter<void>();

  links = [
    { label: 'Trang chu', route: '/gap-move/home' },
    { label: 'Chuyen di', route: '/gap-move/bookings' },
    { label: 'Giao hang', route: '/gap-move/deliveries' },
    { label: 'Vi GapMove', route: '/gap-move/wallet' },
    { label: 'Ho tro', route: '/gap-move/support-chat' },
  ];
}
