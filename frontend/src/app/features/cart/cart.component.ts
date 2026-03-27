import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TimeoutError, forkJoin } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../Services/auth.service';
import { CartItem, CartService } from '../../Services/cart.service';
import { TransactionService } from '../../Services/transaction.service';
import { environment } from '../../environments/environment';
import { finalize, timeout } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-cart',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent implements OnInit {
  items: CartItem[] = [];
  loading = false;
  message = '';
  orderForm: FormGroup;
  private readonly checkoutDraftKey = 'eco-checkout-draft';
  private readonly checkoutTimeoutMs = 12000;
  private loadingWatchdog: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private transactionService: TransactionService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.orderForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: [{ value: '', disabled: true }],
      phone: ['', [Validators.required, Validators.minLength(8)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      postalCode: ['', [Validators.required, Validators.minLength(4)]],
      paymentMethod: ['CashOnDelivery', Validators.required],
      cardNumber: [''],
      cardHolder: [''],
      expiryMonth: [''],
      expiryYear: [''],
      cvv: ['']
    });
  }

  ngOnInit(): void {
    this.loadCart();
    this.prefillOrderForm();
    this.updatePaymentFieldsValidators(this.orderForm.get('paymentMethod')?.value);

    this.orderForm.get('paymentMethod')?.valueChanges.subscribe((method) => {
      this.updatePaymentFieldsValidators(method);
    });

    this.orderForm.valueChanges.subscribe(() => this.saveCheckoutDraft());
  }

  private prefillOrderForm(): void {
    const currentUser = this.authService.getCurrentUser();
    const fullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim();
    const email = currentUser?.email || '';

    this.orderForm.patchValue({
      fullName,
      email
    }, { emitEvent: false });

    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(this.checkoutDraftKey);
      if (raw) {
        try {
          const draft = JSON.parse(raw);
          this.orderForm.patchValue({
            phone: draft?.phone || '',
            address: draft?.address || '',
            city: draft?.city || '',
            postalCode: draft?.postalCode || '',
            paymentMethod: draft?.paymentMethod || 'CashOnDelivery'
          }, { emitEvent: false });
        } catch {
          // Ignore corrupted draft
        }
      }
    }
  }

  private saveCheckoutDraft(): void {
    if (typeof window === 'undefined') return;

    const draft = {
      phone: this.orderForm.get('phone')?.value || '',
      address: this.orderForm.get('address')?.value || '',
      city: this.orderForm.get('city')?.value || '',
      postalCode: this.orderForm.get('postalCode')?.value || '',
      paymentMethod: this.orderForm.get('paymentMethod')?.value || 'CashOnDelivery'
    };

    localStorage.setItem(this.checkoutDraftKey, JSON.stringify(draft));
  }

  showCardPaymentFields(): boolean {
    const paymentMethod = this.orderForm.get('paymentMethod')?.value;
    return paymentMethod !== 'CashOnDelivery';
  }

  private updatePaymentFieldsValidators(paymentMethod: string | null): void {
    const cardFields = ['cardNumber', 'cardHolder', 'expiryMonth', 'expiryYear', 'cvv'];
    const needsCard = paymentMethod !== 'CashOnDelivery';

    if (needsCard) {
      this.orderForm.get('cardNumber')?.setValidators([Validators.required, Validators.pattern(/^\d{8,19}$/)]);
      this.orderForm.get('cardHolder')?.setValidators([Validators.required, Validators.minLength(3)]);
      this.orderForm.get('expiryMonth')?.setValidators([Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]);
      this.orderForm.get('expiryYear')?.setValidators([Validators.required, Validators.pattern(/^\d{2}$/)]);
      this.orderForm.get('cvv')?.setValidators([Validators.required, Validators.pattern(/^\d{3,4}$/)]);
    } else {
      cardFields.forEach((field) => {
        this.orderForm.get(field)?.clearValidators();
        this.orderForm.get(field)?.setValue('', { emitEvent: false });
      });
    }

    cardFields.forEach((field) => {
      this.orderForm.get(field)?.updateValueAndValidity({ emitEvent: false });
    });
  }

  loadCart(): void {
    this.items = this.cartService.getItems();
  }

  increase(item: CartItem): void {
    this.cartService.updateQuantity(item.productId, item.quantity + 1);
    this.loadCart();
  }

  decrease(item: CartItem): void {
    if (item.quantity <= 1) {
      this.remove(item);
      return;
    }

    this.cartService.updateQuantity(item.productId, item.quantity - 1);
    this.loadCart();
  }

  remove(item: CartItem): void {
    this.cartService.remove(item.productId);
    this.loadCart();
  }

  checkout(): void {
    this.message = '';

    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      this.message = 'Veuillez remplir le formulaire de commande.';
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
      return;
    }

    if ((currentUser.role || '').toLowerCase() !== 'buyer') {
      this.message = 'Seul un compte acheteur peut passer une commande.';
      return;
    }

    if (this.items.length === 0) {
      this.message = 'Votre panier est vide.';
      return;
    }

    const confirmed = window.confirm(`Confirmer la commande de ${this.items.length} produit(s) pour un total de ${this.formatPriceDT(this.total)} ?`);
    if (!confirmed) {
      return;
    }

    this.loading = true;
    this.startLoadingWatchdog();

    const requests = this.items.map(item =>
      this.transactionService.purchase({
        buyerId: currentUser.id,
        productId: item.productId,
        quantity: item.quantity,
        paymentMethod: this.orderForm.get('paymentMethod')?.value || 'CashOnDelivery',
        fullName: this.orderForm.get('fullName')?.value || '',
        email: this.orderForm.get('email')?.value || '',
        phone: this.orderForm.get('phone')?.value || '',
        address: this.orderForm.get('address')?.value || '',
        city: this.orderForm.get('city')?.value || '',
        postalCode: this.orderForm.get('postalCode')?.value || ''
      }).pipe(timeout(this.checkoutTimeoutMs))
    );

    forkJoin(requests)
      .pipe(finalize(() => {
        this.clearLoadingWatchdog();
        this.loading = false;
      }))
      .subscribe({
      next: () => {
        this.cartService.clear();
        this.loadCart();
        this.orderForm.patchValue({
          phone: '',
          address: '',
          city: '',
          postalCode: '',
          paymentMethod: 'CashOnDelivery',
          cardNumber: '',
          cardHolder: '',
          expiryMonth: '',
          expiryYear: '',
          cvv: ''
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem(this.checkoutDraftKey);
        }
        this.message = 'Commande validée avec succès.';
        this.router.navigate(['/buyer-dashboard'], { queryParams: { tab: 'orders' } });
      },
      error: (error) => {
        if (error instanceof TimeoutError) {
          this.message = 'Le serveur met trop de temps à répondre. Vérifiez que l\'API est démarrée puis réessayez.';
          return;
        }

        if (error?.status === 0) {
          this.message = `Serveur indisponible. Démarrez l'API backend sur ${environment.apiUrl.replace('/api', '')} puis réessayez.`;
          return;
        }

        this.message = error?.error?.message || 'Impossible de finaliser la commande.';
      }
    });
  }

  private startLoadingWatchdog(): void {
    this.clearLoadingWatchdog();
    this.loadingWatchdog = setTimeout(() => {
      if (!this.loading) return;

      this.loading = false;
      this.message = 'La commande a été interrompue car la réponse serveur est trop lente. Veuillez réessayer.';
    }, this.checkoutTimeoutMs + 3000);
  }

  private clearLoadingWatchdog(): void {
    if (!this.loadingWatchdog) return;
    clearTimeout(this.loadingWatchdog);
    this.loadingWatchdog = null;
  }

  canCheckout(): boolean {
    return !this.loading && this.items.length > 0;
  }

  getCheckoutLabel(): string {
    if (this.loading) return 'Commande en cours...';
    if (this.items.length === 0) return 'Ajoutez un produit au panier';
    return 'Passer commande';
  }

  get total(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  formatPriceDT(amount: number): string {
    return `${Number(amount || 0).toFixed(2)} DT`;
  }
}
