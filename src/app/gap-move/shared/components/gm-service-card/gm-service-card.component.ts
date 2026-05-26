import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export interface GmServiceCardData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'app-gm-service-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './gm-service-card.component.html',
})
export class GmServiceCardComponent {
  @Input({ required: true }) service!: GmServiceCardData;
  @Output() selectService = new EventEmitter<GmServiceCardData>();
}
