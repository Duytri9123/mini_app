import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  AlertController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { BjVehicleService } from '../../core/services/bj-vehicle.service';
import { BjToastService } from '../../core/services/bj-toast.service';
import { BjVehicle, VehicleType } from '../../core/interfaces/vehicle.interface';
import { BJ_ICONS, BjIconKey } from '../../shared/icons/bj-icons';

@Component({
  selector: 'app-bj-vehicles',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
  ],
  templateUrl: './bj-vehicles.page.html',
})
export class BjVehiclesPage implements OnInit {
  private readonly safeIcons = new Map<BjIconKey, SafeHtml>();
  vehicles: BjVehicle[] = [];
  isLoading = false;

  constructor(
    private vehicleService: BjVehicleService,
    private router: Router,
    private alertCtrl: AlertController,
    private toast: BjToastService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadVehicles();
  }

  get defaultVehicle(): BjVehicle | undefined {
    return this.vehicles.find((v) => v.isDefault);
  }

  icon(key: BjIconKey): SafeHtml {
    const cached = this.safeIcons.get(key);
    if (cached) return cached;
    const safe = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS[key]);
    this.safeIcons.set(key, safe);
    return safe;
  }

  getVehicleIconKey(type: VehicleType): BjIconKey {
    if (type === 'electric') return 'CAR';
    if (type === 'truck') return 'TRUCK';
    if (type === 'suv') return 'SUV';
    return 'CAR';
  }

  getFullImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.loadVehicles();
    event.detail.complete();
  }

  navigateToAdd(): void {
    this.router.navigate(['/bro-jet/vehicles/add']);
  }

  onEdit(vehicle: BjVehicle): void {
    this.router.navigate(['/bro-jet/vehicles/edit', vehicle.id]);
  }

  async onDelete(vehicle: BjVehicle): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Xóa xe',
      message: `Bạn có chắc muốn xóa xe ${vehicle.licensePlate}?`,
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Xóa',
          role: 'destructive',
          handler: () => this.deleteVehicle(vehicle.id),
        },
      ],
    });
    await alert.present();
  }

  onSetDefault(vehicle: BjVehicle): void {
    this.vehicleService.setDefaultVehicle(vehicle.id).subscribe({
      next: () => {
        this.showToast('Đã đặt xe mặc định', 'success');
        this.loadVehicles();
      },
      error: () => this.showToast('Không thể đặt xe mặc định', 'danger'),
    });
  }

  private loadVehicles(): Promise<void> {
    this.isLoading = true;
    return new Promise((resolve) => {
      this.vehicleService.getVehicles().subscribe({
        next: (vehicles) => {
          this.vehicles = vehicles;
          this.isLoading = false;
          resolve();
        },
        error: () => {
          this.isLoading = false;
          resolve();
        },
      });
    });
  }

  private deleteVehicle(id: string): void {
    this.vehicleService.deleteVehicle(id).subscribe({
      next: () => {
        this.showToast('Đã xóa xe', 'success');
        this.loadVehicles();
      },
      error: () => this.showToast('Không thể xóa xe', 'danger'),
    });
  }

  private showToast(message: string, color: string): void {
    if (color === 'danger') this.toast.error(message);
    else this.toast.success(message);
  }
}
