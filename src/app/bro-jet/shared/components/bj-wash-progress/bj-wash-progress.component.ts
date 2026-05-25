import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bj-wash-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bj-wash-progress.component.html',
  styles: [`
    .progress-bar {
      transition: width 0.6s ease-in-out;
    }
  `],
})
export class BjWashProgressComponent {
  @Input() progress: number = 0;
  @Input() status: string = '';
  @Input() etaSeconds: number = 0;

  get clampedProgress(): number {
    return Math.min(100, Math.max(0, this.progress));
  }

  get etaFormatted(): string {
    if (this.etaSeconds <= 0) return '00:00';
    const m = Math.floor(this.etaSeconds / 60);
    const s = this.etaSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  get progressColor(): string {
    if (this.clampedProgress >= 100) return 'bg-green-500';
    if (this.clampedProgress >= 60) return 'bg-blue-500';
    return 'bg-blue-400';
  }
}
