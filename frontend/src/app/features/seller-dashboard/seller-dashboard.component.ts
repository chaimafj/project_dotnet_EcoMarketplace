import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product, ProductService } from '../../Services/product.service';
import { AuthService } from '../../Services/auth.service';
import { SellerSale, TransactionService } from '../../Services/transaction.service';

interface SalesData {
  month: string;
  sales: number;
  revenueLabel: string;
  averageLabel: string;
}

@Component({
  standalone: true,
  selector: 'app-seller-dashboard',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './seller-dashboard.component.html',
  styleUrl: './seller-dashboard.component.scss'
})
export class SellerDashboardComponent implements OnInit {
  currentTab: 'add' | 'manage' | 'sales' | 'environmental' = 'manage';
  
  user: any;
  loading = false;
  products: Product[] = [];
  sellerSales: SellerSale[] = [];
  imageIndexes: Record<string, number> = {};
  productImagePreviews: string[] = [];
  private readonly fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80';
  
  publishForm: FormGroup;
  
  salesData: SalesData[] = [];

  categories = [
    { label: 'Électronique', value: 'Electronics' },
    { label: 'Textile / Vêtements', value: 'Textile' },
    { label: 'Meubles', value: 'Furniture' },
    { label: 'Livres', value: 'Books' },
    { label: 'Sports', value: 'Sports' },
    { label: 'Autre', value: 'Other' }
  ];
  conditions = [
    { label: 'Neuf', value: 'New' },
    { label: 'Comme neuf', value: 'LikeNew' },
    { label: 'Bon état', value: 'Good' },
    { label: 'État acceptable', value: 'Fair' },
    { label: 'Pour recyclage', value: 'ForRecycling' }
  ];
  currencies = [
    { label: 'Dinar Tunisien (DT)', value: 'DT' },
    { label: 'Euro (€)', value: 'EUR' },
    { label: 'Dollar américain ($)', value: 'USD' }
  ];

  constructor(
    private productService: ProductService,
    private transactionService: TransactionService,
    public authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.user = this.authService.getCurrentUser();
    this.publishForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      price: ['', [Validators.required, Validators.min(0.01)]],
      currency: ['DT', Validators.required],
      category: ['', Validators.required],
      condition: ['', Validators.required],
      material: ['', Validators.required],
      co2Saved: ['', Validators.min(0)],
      recycledPercentage: ['', [Validators.min(0), Validators.max(100)]],
      image: ['']
    });
  }

  ngOnInit(): void {
    this.loadMyProducts();
    this.loadMySales();
  }

  setTab(tab: 'add' | 'manage' | 'sales' | 'environmental'): void {
    this.currentTab = tab;
    if (tab === 'sales') {
      this.loadMySales();
    }
  }

  loadMySales(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.sellerSales = [];
      return;
    }

    this.transactionService.getBySeller(Number(currentUser.id)).subscribe({
      next: (sales) => {
        this.sellerSales = sales ?? [];
        this.refreshSalesData();
      },
      error: () => {
        this.sellerSales = [];
        this.refreshSalesData();
      }
    });
  }

  loadMyProducts(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('Aucun utilisateur authentifié');
      this.products = [];
      return;
    }

    console.log(`Chargement des produits du vendeur ID: ${currentUser.id}`);
    this.loading = true;
    this.productService.getProducts({ page: 1, pageSize: 100, sellerId: currentUser.id }).subscribe({
      next: (response) => {
        console.log('Réponse API:', response);
        const allProducts = ((response?.items ?? []) as Product[]).map((product) => this.normalizeProduct(product));
        console.log(`Total produits reçus: ${allProducts.length}`);
        this.products = allProducts;
        console.log(`Produits affichés: ${this.products.length}`);
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des produits:', error);
        this.products = [];
        this.loading = false;
      }
    });
  }

  publishProduct(): void {
    if (this.publishForm.invalid) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.loading = true;
    const formValue = this.publishForm.value;
    const imageUrl = String(formValue.image || '').trim();
    const images = [
      ...this.productImagePreviews,
      ...(imageUrl ? [imageUrl] : [])
    ];

    // Préparer les données pour l'API
    const productRequest = {
      sellerId: this.user?.id,
      title: formValue.title,
      description: formValue.description,
      price: parseFloat(formValue.price),
      currency: formValue.currency,
      condition: formValue.condition,   // déjà en anglais (enum value)
      category: formValue.category,    // déjà en anglais (enum value)
      images: images.length
        ? images
        : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'],
      location: 'Non précisée',
      latitude: 0,
      longitude: 0,
      material: formValue.material,
      isRecycled: formValue.recycledPercentage > 0,
      isSustainable: true,
      carbonFootprint: formValue.co2Saved || 0,
      recycledPercentage: formValue.recycledPercentage || 0
    };

    console.log('📦 Envoi du produit:', productRequest);

    // Appeler l'API pour créer le produit
    this.productService.createProduct(productRequest).subscribe({
      next: (createdProduct) => {
        console.log('✅ Produit créé avec succès:', createdProduct);
        this.loading = false;
        alert('Produit publié avec succès!');
        this.publishForm.reset({ currency: 'DT' });
        this.productImagePreviews = [];
        this.currentTab = 'manage';
        this.loadMyProducts(); // Récharger la liste
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du produit:', error);
        console.error('Réponse complète:', error.error);
        const errorMsg = error?.error?.message || error?.message || 'Erreur inconnue';
        alert(`Erreur lors de la publication: ${errorMsg}`);
        this.loading = false;
      }
    });
  }

  deleteProduct(productId: string | number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
      this.products = this.products.filter(p => String(p.id) !== String(productId));
      alert('Produit supprimé');
    }
  }

  private normalizeProduct(product: Product): Product {
    const images = Array.isArray((product as any)?.images)
      ? (product as any).images
      : Array.isArray((product as any)?.Images)
        ? (product as any).Images
        : [];
    const image = (product as any)?.image ?? (product as any)?.Image ?? images[0] ?? this.fallbackImage;

    return {
      ...product,
      image,
      images: images.length ? images : [this.fallbackImage],
      location: product.location ?? 'Non précisée',
      material: product.material ?? 'N/A',
      category: product.category ?? 'Other',
      condition: product.condition ?? 'Good',
      ecoScore: Number(product.ecoScore ?? 0),
      price: Number(product.price ?? 0),
      recycledPercentage: Number(product.recycledPercentage ?? 0),
      currency: (product as any)?.currency ?? (product as any)?.Currency ?? 'DT'
    };
  }

  getCurrentProductImage(product: Product): string {
    const images = product.images?.length ? product.images : [product.image || this.fallbackImage];
    const index = this.imageIndexes[String(product.id)] ?? 0;
    return images[index] || images[0];
  }

  showImageNavigation(product: Product): boolean {
    return (product.images?.length ?? 0) > 1;
  }

  getCurrentImagePosition(product: Product): number {
    return (this.imageIndexes[String(product.id)] ?? 0) + 1;
  }

  previousImage(product: Product, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const images = product.images?.length ? product.images : [product.image || this.fallbackImage];
    const key = String(product.id);
    const currentIndex = this.imageIndexes[key] ?? 0;
    this.imageIndexes[key] = (currentIndex - 1 + images.length) % images.length;
  }

  nextImage(product: Product, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const images = product.images?.length ? product.images : [product.image || this.fallbackImage];
    const key = String(product.id);
    const currentIndex = this.imageIndexes[key] ?? 0;
    this.imageIndexes[key] = (currentIndex + 1) % images.length;
  }

  editProduct(product: Product): void {
    this.publishForm.patchValue({
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      condition: product.condition,
      material: product.material,
      co2Saved: product.co2Saved,
      recycledPercentage: product.recycledPercentage
    });
    this.currentTab = 'add';
  }

  onProductPhotosChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const maxSize = 8 * 1024 * 1024;
    const accepted = [...input.files].filter((file) => file.type.startsWith('image/') && file.size <= maxSize);
    if (!accepted.length) return;

    accepted.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        if (result) {
          this.productImagePreviews = [...this.productImagePreviews, result].slice(0, 8);
        }
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }

  removeProductPhoto(index: number): void {
    this.productImagePreviews = this.productImagePreviews.filter((_, i) => i !== index);
  }

  get totalProducts(): number {
    return this.products.length;
  }

  get averageEcoScore(): number {
    if (!this.products.length) return 0;
    const total = this.products.reduce((sum, p) => sum + p.ecoScore, 0);
    return Math.round(total / this.products.length);
  }

  get totalSales(): number {
    return this.sellerSales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
  }

  get totalRevenue(): number {
    return this.sellerSales.reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);
  }

  get totalRevenueLabel(): string {
    return this.formatCurrencyTotals(this.buildCurrencyTotals(this.sellerSales));
  }

  get totalCO2Saved(): number {
    return this.products.reduce((sum, p) => sum + (p.co2Saved || 0), 0);
  }

  get averageRecycledPercentage(): number {
    if (!this.products.length) return 0;
    const total = this.products.reduce((sum, p) => sum + (p.recycledPercentage || 0), 0);
    return Math.round(total / this.products.length);
  }

  get sellerName(): string {
    const first = this.user?.firstName || '';
    const last = this.user?.lastName || '';
    const fullName = `${first} ${last}`.trim();
    return fullName || this.user?.username || 'Vendeur';
  }

  get sellerPhoto(): string {
    return this.user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.sellerName)}&background=1a7c50&color=fff&size=128`;
  }

  getCurrencySymbol(currency?: string): string {
    const curr = (currency || 'DT').toUpperCase();
    switch (curr) {
      case 'EUR':
        return '€';
      case 'USD':
        return '$';
      case 'DT':
      default:
        return 'DT';
    }
  }

  formatPriceWithCurrency(price: number, currency?: string): string {
    const symbol = this.getCurrencySymbol(currency);
    const curr = (currency || 'DT').toUpperCase();
    
    if (curr === 'USD') {
      return `${symbol}${price.toFixed(2)}`;
    } else if (curr === 'EUR') {
      return `${price.toFixed(2)}${symbol}`;
    } else {
      return `${price.toFixed(2)} ${symbol}`;
    }
  }

  private refreshSalesData(): void {
    const now = new Date();
    const recentMonths = [2, 1, 0].map((offset) => new Date(now.getFullYear(), now.getMonth() - offset, 1));

    this.salesData = recentMonths.map((monthDate) => {
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();
      const monthSales = this.sellerSales.filter((sale) => {
        const d = new Date(sale.purchasedAt);
        return d.getFullYear() === year && d.getMonth() === month;
      });

      const unitsSold = monthSales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0);
      const totalsByCurrency = this.buildCurrencyTotals(monthSales);

      return {
        month: this.getMonthLabel(month),
        sales: unitsSold,
        revenueLabel: this.formatCurrencyTotals(totalsByCurrency),
        averageLabel: unitsSold > 0
          ? this.formatCurrencyTotals(this.divideCurrencyTotals(totalsByCurrency, unitsSold))
          : '-'
      };
    });
  }

  private buildCurrencyTotals(sales: SellerSale[]): Record<string, number> {
    return sales.reduce((acc, sale) => {
      const currency = (sale.currency || 'DT').toUpperCase();
      const amount = Number(sale.totalPrice || 0);
      acc[currency] = (acc[currency] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
  }

  private divideCurrencyTotals(totals: Record<string, number>, divisor: number): Record<string, number> {
    if (divisor <= 0) return totals;
    return Object.keys(totals).reduce((acc, currency) => {
      acc[currency] = totals[currency] / divisor;
      return acc;
    }, {} as Record<string, number>);
  }

  private formatCurrencyTotals(totals: Record<string, number>): string {
    const order = ['DT', 'EUR', 'USD'];
    const chunks = order
      .filter((currency) => typeof totals[currency] === 'number' && totals[currency] > 0)
      .map((currency) => this.formatPriceWithCurrency(totals[currency], currency));

    return chunks.length ? chunks.join(' | ') : this.formatPriceWithCurrency(0, 'DT');
  }

  private getMonthLabel(monthIndex: number): string {
    const labels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    return labels[monthIndex] ?? '-';
  }
}
