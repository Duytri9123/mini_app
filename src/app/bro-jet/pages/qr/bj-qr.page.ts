import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { QRCodeComponent } from 'angularx-qrcode';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BjAuthService } from '../../core/services/bj-auth.service';
import { BjUser } from '../../core/interfaces/user.interface';
import { BJ_ICONS } from '../../shared/icons/bj-icons';
import { Subscription } from 'rxjs';
import jsQR from 'jsqr';

@Component({
  selector: 'app-bj-qr',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    QRCodeComponent,
  ],
  templateUrl: './bj-qr.page.html',
})
export class BjQrPage implements OnInit, OnDestroy {
  activeSegment: 'my-qr' | 'scan' = 'scan';
  user: BjUser | null = null;
  qrData = '';
  qrIcon: SafeHtml;

  // Scanner
  scanning = false;
  scanResult = '';
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;
  private stream: MediaStream | null = null;
  private canvasElement!: HTMLCanvasElement;
  private canvasContext!: CanvasRenderingContext2D | null;

  private userSub?: Subscription;

  constructor(
    private authService: BjAuthService,
    private router: Router,
    private sanitizer: DomSanitizer,
  ) {
    this.qrIcon = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS.QR_CODE);
  }

  ngOnInit(): void {
    this.canvasElement = document.createElement('canvas');
    this.canvasContext = this.canvasElement.getContext('2d', { willReadFrequently: true });

    this.userSub = this.authService.currentUser$.subscribe((u) => {
      this.user = u;
      this.generateQrData();
    });

    if (this.activeSegment === 'scan') {
      this.startScanner();
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.stopScanner();
  }

  switchTab(tab: 'my-qr' | 'scan'): void {
    this.activeSegment = tab;
    if (tab === 'scan') {
      this.startScanner();
    } else {
      this.stopScanner();
    }
  }

  private generateQrData(): void {
    if (this.user) {
      this.qrData = JSON.stringify({
        type: 'brojet_user',
        userId: this.user.id,
        name: this.user.fullName,
        phone: this.user.phone,
        timestamp: Date.now(),
      });
    } else {
      this.qrData = 'brojet://guest';
    }
  }

  // ── Scanner ─────────────────────────────────────────────────────────────────

  async startScanner(): Promise<void> {
    this.scanning = true;
    this.scanResult = '';

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (this.videoRef?.nativeElement && this.stream) {
        this.videoRef.nativeElement.srcObject = this.stream;
        this.videoRef.nativeElement.setAttribute('playsinline', 'true');
        await this.videoRef.nativeElement.play();
        requestAnimationFrame(this.tick.bind(this));
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      this.scanning = false;
    }
  }

  private tick(): void {
    if (!this.scanning) {
      return;
    }

    const video = this.videoRef?.nativeElement;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      this.canvasElement.height = video.videoHeight;
      this.canvasElement.width = video.videoWidth;
      
      if (this.canvasContext) {
        this.canvasContext.drawImage(video, 0, 0, this.canvasElement.width, this.canvasElement.height);
        const imageData = this.canvasContext.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          this.scanResult = code.data;
          this.stopScanner();
          return;
        }
      }
    }

    requestAnimationFrame(this.tick.bind(this));
  }

  stopScanner(): void {
    this.scanning = false;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
