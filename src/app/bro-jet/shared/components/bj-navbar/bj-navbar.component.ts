import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';



export interface BjNavbarItem {
    key: string;
    label: string;
}

@Component({
    selector: 'app-bj-navbar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './bj-navbar.component.html',

})
export class BjNavbarComponent {
    @Input() items: BjNavbarItem[] = [];
    @Input() activeKey = '';

    @Output() activeKeyChange = new EventEmitter<string>();

    selectItem(key: string): void {
        this.activeKeyChange.emit(key);
    }
}
