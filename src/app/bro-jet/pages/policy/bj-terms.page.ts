import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-bj-terms',
  standalone: true,
  imports: [CommonModule, IonContent],
  templateUrl: './bj-terms.page.html',
})
export class BjTermsPage {}
