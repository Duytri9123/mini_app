import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BjStationService } from '../../core/services/bj-station.service';
import { BjServiceCardComponent } from '../../shared/components/bj-service-card/bj-service-card.component';
import { BjPageHeaderComponent } from '../../shared/components/bj-page-header/bj-page-header.component';
import { BjLoadingSpinnerComponent } from '../../shared/components/bj-loading-spinner/bj-loading-spinner.component';
import { BjErrorStateComponent } from '../../shared/components/bj-error-state/bj-error-state.component';
import { BjStationDetailComponent } from '../../shared/components/bj-station-detail/bj-station-detail.component';
import { BjStation, BjServicePackage } from '../../core/interfaces/station.interface';

@Component({
  selector: 'bj-station-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, BjServiceCardComponent, BjPageHeaderComponent, BjLoadingSpinnerComponent, BjErrorStateComponent, BjStationDetailComponent],
  templateUrl: './bj-station-detail.page.html',
})
export class BjStationDetailPage implements OnInit {
  public stationId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.stationId = this.route.snapshot.paramMap.get('id') ?? '';
  }

  goBack(): void {
    this.router.navigate(['/bro-jet/explore']);
  }
}
