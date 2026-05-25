import {
  Injectable,
  ApplicationRef,
  ComponentFactoryResolver,
  Injector,
  EmbeddedViewRef,
  ComponentRef,
} from '@angular/core';
import { BjToastComponent } from '../../shared/components/bj-toast/bj-toast.component';

type BjToastType = 'success' | 'danger' | 'warning' | 'info';
type BjToastPosition = 'top' | 'bottom' | 'middle';

interface BjToastQueueItem {
  message: string;
  type: BjToastType;
  duration: number;
  position: BjToastPosition;
  resolve: (ref: ComponentRef<BjToastComponent>) => void;
}

@Injectable({
  providedIn: 'root',
})
export class BjToastService {
  private toastRefs: ComponentRef<BjToastComponent>[] = [];
  private toastQueue: BjToastQueueItem[] = [];
  private activeToastRef: ComponentRef<BjToastComponent> | null = null;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private appRef: ApplicationRef,
    private injector: Injector
  ) {}

  private createToast(
    message: string,
    type: BjToastType,
    duration: number,
    position: BjToastPosition = 'top'
  ): ComponentRef<BjToastComponent> {
    const componentRef = this.componentFactoryResolver
      .resolveComponentFactory(BjToastComponent)
      .create(this.injector);

    componentRef.instance.message = message;
    componentRef.instance.type = type;
    componentRef.instance.duration = duration;
    componentRef.instance.position = position;

    componentRef.instance.closed.subscribe(() => {
      this.removeToast(componentRef);
      if (this.activeToastRef === componentRef) {
        this.activeToastRef = null;
      }
      this.processQueue();
    });

    this.appRef.attachView(componentRef.hostView);
    const domElem = (componentRef.hostView as EmbeddedViewRef<any>)
      .rootNodes[0] as HTMLElement;
    document.body.appendChild(domElem);

    this.toastRefs.push(componentRef);
    return componentRef;
  }

  private enqueueToast(
    message: string,
    type: BjToastType,
    duration: number,
    position: BjToastPosition
  ): Promise<ComponentRef<BjToastComponent>> {
    return new Promise<ComponentRef<BjToastComponent>>((resolve) => {
      this.toastQueue.push({ message, type, duration, position, resolve });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.activeToastRef || this.toastQueue.length === 0) {
      return;
    }

    const nextToast = this.toastQueue.shift();
    if (!nextToast) return;

    const ref = this.createToast(
      nextToast.message,
      nextToast.type,
      nextToast.duration,
      nextToast.position
    );

    this.activeToastRef = ref;
    nextToast.resolve(ref);
  }

  private removeToast(componentRef: ComponentRef<BjToastComponent>): void {
    const index = this.toastRefs.indexOf(componentRef);
    if (index > -1) {
      this.toastRefs.splice(index, 1);
    }
    this.appRef.detachView(componentRef.hostView);
    componentRef.destroy();
  }

  /** Hiển thị toast tuỳ chỉnh */
  async presentToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'primary' = 'success',
    duration: number = 3000,
    position: BjToastPosition = 'top'
  ) {
    const type: BjToastType = color === 'primary' ? 'info' : color;
    return this.enqueueToast(message, type, duration, position);
  }

  /** Toast thành công */
  async success(
    message: string,
    duration: number = 3000,
    position: BjToastPosition = 'top'
  ) {
    return this.enqueueToast(message, 'success', duration, position);
  }

  /** Toast lỗi */
  async error(
    message: string,
    duration: number = 4000,
    position: BjToastPosition = 'top'
  ) {
    return this.enqueueToast(message, 'danger', duration, position);
  }

  /** Toast cảnh báo */
  async warning(
    message: string,
    duration: number = 3500,
    position: BjToastPosition = 'top'
  ) {
    return this.enqueueToast(message, 'warning', duration, position);
  }

  /** Toast thông tin */
  async info(
    message: string,
    duration: number = 3000,
    position: BjToastPosition = 'top'
  ) {
    return this.enqueueToast(message, 'info', duration, position);
  }
}
