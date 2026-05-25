import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  IonContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  InfiniteScrollCustomEvent,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';

import { WalletApiService, CreateWithdrawPayload } from '../../features/wallet/services/wallet-api.service';
import { VietQrBuilderService } from '../../features/wallet/services/vietqr-builder.service';
import { WalletRealtimeService } from '../../features/wallet/services/wallet-realtime.service';
import {
  BjBank,
  BjVietQrConfig,
  BjWallet,
  BjWalletTransaction,
  BjWithdrawRequest,
  WalletTopupEvent,
} from '../../features/wallet/interfaces/wallet.types';

import { BjModalWalletComponent } from '../../shared/components/bj-modal-wallets/bj-modal-wallet.component';
import { BjModalWithdrawComponent } from '../../shared/components/bj-modal-withdraw/bj-modal-withdraw.component';
import { BjToastService } from '../../core/services/bj-toast.service';
import { BJ_ICONS, BjIconKey } from '../../shared/icons/bj-icons';

export type { BjWallet, BjWalletTransaction };

type HistoryType = 'history_transaction' | 'requests';

interface PresetAmount { label: string; value: number; }
interface TypeFilterOption { value: HistoryType; label: string; }

@Component({
  selector: 'app-bj-wallet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    BjModalWalletComponent,
    BjModalWithdrawComponent,
  ],
  templateUrl: './bj-wallet.page.html',
})
export class BjWalletPage implements OnInit, OnDestroy {
  private readonly safeIcons = new Map<BjIconKey, SafeHtml>();
  private readonly subs = new Subscription();

  @ViewChild(IonInfiniteScroll) infiniteScroll?: IonInfiniteScroll;

  // ─── State ──────────────────────────────────────────────────────────────────
  wallet: BjWallet | null = null;
  transactions: BjWalletTransaction[] = [];
  withdrawRequests: BjWithdrawRequest[] = [];
  banks: BjBank[] = [];

  isLoadingWallet = false;
  isLoadingTransactions = false;
  hasMore = true;

  // Topup modal
  isTopupModalOpen = false;
  selectedPreset: number | null = null;
  customAmount: number | null = null;
  qrData: string | null = null;
  isWaitingPayment = false;

  // Withdraw modal
  isWithdrawModalOpen = false;
  isSubmittingWithdraw = false;
  isCancellingWithdraw = false;

  // Withdraw requests pagination
  withdrawRequestsPage = 1;
  withdrawRequestsHasMore = true;
  isLoadingWithdrawRequests = false;
  private readonly REQUESTS_LIMIT = 10;

  selectedType: HistoryType = 'history_transaction';

  private page = 1;
  private readonly LIMIT = 15;

  readonly presetAmounts: PresetAmount[] = [
    { label: '50k', value: 50_000 },
    { label: '100k', value: 100_000 },
    { label: '200k', value: 200_000 },
    { label: '500k', value: 500_000 },
  ];

  readonly typeFilters: TypeFilterOption[] = [
    { value: 'history_transaction', label: 'Lịch sử giao dịch' },
    { value: 'requests', label: 'Yêu cầu rút tiền' },
  ];

  readonly emptyIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>`;

  constructor(
    private walletApi: WalletApiService,
    private vietQrBuilder: VietQrBuilderService,
    private walletRealtime: WalletRealtimeService,
    private toast: BjToastService,
    private sanitizer: DomSanitizer,
  ) { }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadWallet();
    this.loadTransactions(true);
    this.loadWithdrawRequests(true);
    this.loadBanks();
    this.initRealtimeListener();
  }

  ionViewWillEnter(): void {
    this.loadWallet();
    this.loadWithdrawRequests(true);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.walletRealtime.unsubscribe();
  }

  // ─── Computed ───────────────────────────────────────────────────────────────

  get topupAmount(): number {
    return this.selectedPreset ?? this.customAmount ?? 0;
  }

  get minTopupAmount(): number {
    return this.wallet?.minTopupAmount ?? 100_000;
  }

  get isTopupValid(): boolean {
    return this.topupAmount >= this.minTopupAmount;
  }

  get filteredTransactions(): BjWalletTransaction[] {
    if (this.selectedType === 'history_transaction') return this.transactions;
    return this.transactions.filter(tx => tx.type === 'withdraw');
  }

  // ─── Icon helper ────────────────────────────────────────────────────────────

  icon(key: BjIconKey): SafeHtml {
    const cached = this.safeIcons.get(key);
    if (cached) return cached;
    const safe = this.sanitizer.bypassSecurityTrustHtml(BJ_ICONS[key]);
    this.safeIcons.set(key, safe);
    return safe;
  }

  // ─── Topup modal ────────────────────────────────────────────────────────────

  openTopupModal(): void {
    this.selectedPreset = null;
    this.customAmount = null;
    this.qrData = null;
    this.isWaitingPayment = false;
    this.isTopupModalOpen = true;
  }

  closeTopupModal(): void {
    this.isTopupModalOpen = false;
    this.qrData = null;
    this.isWaitingPayment = false;
  }

  onPresetSelect(amount: number): void {
    this.selectedPreset = amount;
    this.customAmount = null;
    this.qrData = null;
  }

  onCustomAmountChange(value?: number | null): void {
    this.customAmount = value ?? null;
    this.selectedPreset = null;
    this.qrData = null;
  }

  onConfirmTopup(): void {
    if (!this.isTopupValid) return;

    const config = this.wallet?.vietqrConfig;
    if (!config) {
      this.loadWallet().then(() => {
        const freshConfig = this.wallet?.vietqrConfig;
        if (!freshConfig) {
          this.toast.error('Chưa cấu hình thông tin ngân hàng. Vui lòng liên hệ admin.');
          return;
        }
        this.generateQr(freshConfig);
      });
      return;
    }
    this.generateQr(config);
  }

  private generateQr(config: BjVietQrConfig): void {
    const url = this.vietQrBuilder.buildUrl(config, this.topupAmount);
    if (!url) {
      this.toast.error('Không thể tạo mã QR. Vui lòng thử lại.');
      return;
    }
    this.qrData = url;
    this.isWaitingPayment = true;
    this.toast.info('Quét mã QR để hoàn tất nạp tiền.');
  }

  // ─── Withdraw modal ─────────────────────────────────────────────────────────

  openWithdrawModal(): void {
    this.isWithdrawModalOpen = true;
  }

  closeWithdrawModal(): void {
    this.isWithdrawModalOpen = false;
  }

  onSubmitWithdraw(payload: CreateWithdrawPayload): void {
    if (this.isSubmittingWithdraw) return;
    this.isSubmittingWithdraw = true;

    this.walletApi.createWithdrawRequest(payload).subscribe({
      next: (res) => {
        this.isSubmittingWithdraw = false;
        this.closeWithdrawModal();
        this.toast.success(res.message ?? 'Yêu cầu rút tiền đã được gửi.');
        this.loadWallet();
        this.loadWithdrawRequests(true);
        this.loadTransactions(true);
      },
      error: (err) => {
        this.isSubmittingWithdraw = false;
        const msg = err?.error?.message ?? 'Không thể gửi yêu cầu rút tiền.';
        this.toast.error(msg);
      },
    });
  }

  cancelWithdrawRequest(request: BjWithdrawRequest): void {
    if (this.isCancellingWithdraw || request.status !== 'pending') return;
    this.isCancellingWithdraw = true;

    this.walletApi.cancelWithdrawRequest(request.id).subscribe({
      next: (res) => {
        this.isCancellingWithdraw = false;
        this.toast.success(res.message ?? 'Yêu cầu rút tiền đã được hủy.');
        this.loadWallet();
        this.loadWithdrawRequests(true);
        this.loadTransactions(true);
      },
      error: (err) => {
        this.isCancellingWithdraw = false;
        const msg = err?.error?.message ?? 'Không thể hủy yêu cầu rút tiền.';
        this.toast.error(msg);
      },
    });
  }

  // ─── Filters ────────────────────────────────────────────────────────────────

  onTypeFilterChange(type: HistoryType): void {
    this.selectedType = type;
  }

  // ─── Scroll / Refresh ───────────────────────────────────────────────────────

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    await Promise.all([this.loadWallet(), this.loadTransactions(true)]);
    this.loadWithdrawRequests(true);
    event.detail.complete();
  }

  async onInfiniteScroll(event: InfiniteScrollCustomEvent): Promise<void> {
    await this.loadTransactions(false);
    event.target.complete();
  }

  // ─── Display helpers ────────────────────────────────────────────────────────

  getTransactionIcon(type: BjWalletTransaction['type']): string {
    return type === 'topup' || type === 'refund' ? '+' : '-';
  }

  getTransactionColor(type: BjWalletTransaction['type']): string {
    if (type === 'topup') return 'text-green-600';
    if (type === 'refund') return 'text-blue-500';
    return 'text-red-500';
  }

  getTransactionLabel(type: BjWalletTransaction['type']): string {
    const labels: Record<BjWalletTransaction['type'], string> = {
      topup: 'Nạp tiền',
      payment: 'Thanh toán',
      refund: 'Hoàn tiền',
      bonus: 'Thưởng',
      withdraw: 'Rút tiền',
    };
    return labels[type] ?? type;
  }

  getWithdrawStatusLabel(status: BjWithdrawRequest['status']): string {
    return { pending: 'Đang chờ', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã hủy' }[status] ?? status;
  }

  getWithdrawStatusClass(status: BjWithdrawRequest['status']): string {
    return {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-600 border-red-200',
      cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
    }[status] ?? '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  // ─── Realtime ───────────────────────────────────────────────────────────────

  private initRealtimeListener(): void {
    this.walletRealtime.subscribe();
    const sub = this.walletRealtime.topupReceived$.subscribe({
      next: (event) => this.handleTopupReceived(event),
      error: (err) => console.error('[BjWalletPage] Realtime error:', err),
    });
    this.subs.add(sub);
  }

  private handleTopupReceived(event: WalletTopupEvent): void {
    this.loadWallet();
    this.loadTransactions(true);
    this.toast.success(`Nạp tiền thành công ${this.formatCurrency(event.amount)}!`);
  }

  // ─── Data loading ───────────────────────────────────────────────────────────

  loadWallet(): Promise<void> {
    this.isLoadingWallet = true;
    return new Promise((resolve) => {
      this.walletApi.getBalance().subscribe({
        next: (wallet) => { this.wallet = wallet; this.isLoadingWallet = false; resolve(); },
        error: (err) => { console.error('[BjWalletPage] loadWallet error:', err); this.isLoadingWallet = false; resolve(); },
      });
    });
  }

  private loadTransactions(reset: boolean): Promise<void> {
    return new Promise((resolve) => {
      if (reset) {
        this.page = 1; this.transactions = []; this.hasMore = true;
        if (this.infiniteScroll) this.infiniteScroll.disabled = false;
      }
      if (!this.hasMore && !reset) { resolve(); return; }
      if (reset) this.isLoadingTransactions = true;

      this.walletApi.getTransactions(this.page, this.LIMIT).subscribe({
        next: (response) => {
          const newItems = response.data ?? [];
          this.transactions = reset ? newItems : [...this.transactions, ...newItems];
          this.hasMore = this.transactions.length < response.total;
          if (!this.hasMore && this.infiniteScroll) this.infiniteScroll.disabled = true;
          this.page++;
          this.isLoadingTransactions = false;
          resolve();
        },
        error: (err) => { console.error('[BjWalletPage] loadTransactions error:', err); this.isLoadingTransactions = false; resolve(); },
      });
    });
  }

  private loadBanks(): void {
    this.walletApi.getBanks().subscribe({
      next: (res) => { this.banks = res.data ?? []; },
      error: (err) => console.error('[BjWalletPage] loadBanks error:', err),
    });
  }

  private loadWithdrawRequests(reset = true): void {
    if (reset) {
      this.withdrawRequestsPage = 1;
      this.withdrawRequests = [];
      this.withdrawRequestsHasMore = true;
    }
    if (!this.withdrawRequestsHasMore && !reset) return;

    this.isLoadingWithdrawRequests = true;
    this.walletApi.getWithdrawRequests(this.withdrawRequestsPage, this.REQUESTS_LIMIT).subscribe({
      next: (res) => {
        const items = res.data ?? [];
        this.withdrawRequests = reset ? items : [...this.withdrawRequests, ...items];
        this.withdrawRequestsHasMore = this.withdrawRequests.length < res.total;
        this.withdrawRequestsPage++;
        this.isLoadingWithdrawRequests = false;
      },
      error: (err) => {
        console.error('[BjWalletPage] loadWithdrawRequests error:', err);
        this.isLoadingWithdrawRequests = false;
      },
    });
  }

  loadMoreWithdrawRequests(): void {
    this.loadWithdrawRequests(false);
  }

  private async showToast(message: string, color: string): Promise<void> {
    if (color === 'danger') this.toast.error(message);
    else if (color === 'warning') this.toast.warning(message);
    else if (color === 'success') this.toast.success(message);
    else this.toast.info(message);
  }
}
