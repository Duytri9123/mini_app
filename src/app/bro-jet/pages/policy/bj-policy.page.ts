import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonAccordion, IonAccordionGroup, IonItem, IonLabel } from '@ionic/angular/standalone';

@Component({
  selector: 'app-bj-policy',
  templateUrl: './bj-policy.page.html',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonAccordion,
    IonAccordionGroup,
    IonItem,
    IonLabel
  ]
})
export class BjPolicyPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
