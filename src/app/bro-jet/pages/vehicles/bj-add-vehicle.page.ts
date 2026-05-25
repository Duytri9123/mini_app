import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonNote,
  IonBackButton,
  IonButtons,
  IonSpinner,
} from '@ionic/angular/standalone';
import { BjVehicleService } from '../../core/services/bj-vehicle.service';
import { BjToastService } from '../../core/services/bj-toast.service';
import { VehicleType } from '../../core/interfaces/vehicle.interface';
import { BJ_ICONS, BjIconKey } from '../../shared/icons/bj-icons';
import { SafeSvgPipe } from '../../shared/pipes/safe-svg.pipe';

const LICENSE_PLATE_REGEX = /^[0-9]{2}[A-Z]{1,2}[-\s]?[0-9]{4,5}$/i;

export interface VehicleTypeOption {
  value: VehicleType;
  label: string;
}

@Component({
  selector: 'app-bj-add-vehicle',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonNote,
    IonBackButton,
    IonButtons,
    IonSpinner,
    SafeSvgPipe,
  ],
  templateUrl: './bj-add-vehicle.page.html',
})
export class BjAddVehiclePage {
  private readonly safeIcons = new Map<BjIconKey, SafeHtml>();
  form: FormGroup;
  isSubmitting = false;
  isLoading = false;
  duplicatePlateError = false;
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  vehicleId: string | null = null;

  readonly vehicleTypes: VehicleTypeOption[] = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'truck', label: 'Xe tải' },
    { value: 'electric', label: 'Xe điện' },
  ];

  constructor(
    private fb: FormBuilder,
    private vehicleService: BjVehicleService,
    public router: Router,
    private route: ActivatedRoute,
    private toast: BjToastService,
    private sanitizer: DomSanitizer,
  ) {
    this.form = this.fb.group({
      licensePlate: ['', [Validators.required, Validators.pattern(LICENSE_PLATE_REGEX)]],
      name: [''],
      brand: ['', Validators.required],
      model: ['', Validators.required],
      color: ['', Validators.required],
      vehicleType: ['sedan', Validators.required],
      isDefault: [false],
    });
  }

  ngOnInit() {
    this.vehicleId = this.route.snapshot.paramMap.get('id');
    if (this.vehicleId) {
      this.loadVehicleData(this.vehicleId);
    }
  }

  private loadVehicleData(id: string) {
    this.isLoading = true;
    this.vehicleService.getVehicle(id).subscribe({
      next: (vehicle) => {
        this.isLoading = false;
        this.form.patchValue({
          licensePlate: vehicle.licensePlate,
          name: vehicle.name || '',
          brand: vehicle.brand,
          model: vehicle.model,
          color: vehicle.color,
          vehicleType: vehicle.vehicleType,
          isDefault: vehicle.isDefault
        });
        if (vehicle.imageUrl) {
          this.imagePreview = vehicle.imageUrl;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Không thể tải thông tin xe');
        this.router.navigate(['/bro-jet/vehicles']);
      }
    });
  }

  icon(key: BjIconKey): SafeHtml {
    const cached = this.safeIcons.get(key);
    if (cached) return cached;

    const safe = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS[key]);
    this.safeIcons.set(key, safe);
    return safe;
  }

  get licensePlate() { return this.form.get('licensePlate')!; }
  get name() { return this.form.get('name')!; }
  get brand() { return this.form.get('brand')!; }
  get model() { return this.form.get('model')!; }
  get color() { return this.form.get('color')!; }
  get vehicleType() { return this.form.get('vehicleType')!; }
  get isDefault() { return this.form.get('isDefault')!; }

  onLicensePlateChange(): void {
    this.duplicatePlateError = false;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImage = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedImage = null;
    this.imagePreview = null;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.duplicatePlateError = false;

    const data = {
      licensePlate: (this.licensePlate.value as string).toUpperCase().replace(/\s/g, '-'),
      name: this.name.value as string,
      brand: this.brand.value as string,
      model: this.model.value as string,
      color: this.color.value as string,
      image: this.selectedImage,
      isDefault: this.isDefault.value as boolean,
    };

    const request = this.vehicleId 
      ? this.vehicleService.updateVehicle(this.vehicleId, { ...data, _isUpdate: true } as any)
      : this.vehicleService.addVehicle(data);

    request.subscribe({
      next: async () => {
        this.isSubmitting = false;
        this.toast.success(this.vehicleId ? 'Cập nhật xe thành công' : 'Thêm xe thành công');
        this.router.navigate(['/bro-jet/vehicles']);
      },
      error: async (err) => {
        this.isSubmitting = false;
        const isDuplicate = this.isDuplicateError(err);
        if (isDuplicate) {
          this.duplicatePlateError = true;
        } else {
          this.toast.error(this.vehicleId ? 'Không thể cập nhật xe' : 'Không thể thêm xe. Vui lòng thử lại.');
        }
      },
    });
  }

  private isDuplicateError(err: unknown): boolean {
    if (err && typeof err === 'object') {
      const e = err as { status?: number; error?: { message?: string; errors?: any } };
      if (e.status === 409 || e.status === 422) {
         const msg = e.error?.message?.toLowerCase() ?? '';
         const errors = e.error?.errors;
         if (msg.includes('duplicate') || msg.includes('already') || errors?.license_plate) return true;
      }
    }
    return false;
  }

  private showToast(message: string, color: string) {
    if (color === 'danger') this.toast.error(message);
    else this.toast.success(message);
  }
}
