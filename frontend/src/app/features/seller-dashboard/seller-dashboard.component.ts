import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, interval, timer } from 'rxjs';
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
export class SellerDashboardComponent implements OnInit, OnDestroy {
  currentTab: 'add' | 'manage' | 'sales' | 'environmental' = 'manage';
  
  user: any;
  loading = false;
  products: Product[] = [];
  sellerSales: SellerSale[] = [];
  salesMessage = '';
  salesMessageType: 'success' | 'error' = 'success';
  confirmingSaleIds: Record<number, boolean> = {};
  imageIndexes: Record<string, number> = {};
  productImagePreviews: string[] = [];
  private readonly fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80';
  
  publishForm: FormGroup;
  
  salesData: SalesData[] = [];
  private salesRefreshSubscription?: Subscription;
  private productsRefreshSubscription?: Subscription;
  private currentUserSubscription?: Subscription;

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
  materials = [
    { label: 'Plastique recycle', value: 'plastique recycle' },
    { label: 'Plastique standard', value: 'plastique standard' },
    { label: 'Coton biologique', value: 'coton biologique' },
    { label: 'Bois certifie FSC', value: 'bois certifie fsc' },
    { label: 'Bamboo', value: 'bamboo' },
    { label: 'Materiau non recyclable', value: 'materiau non recyclable' },
    { label: 'Autre (saisir manuellement)', value: '__custom__' }
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
      category: ['', Validators.required],
      condition: ['', Validators.required],
      material: ['', Validators.required],
      materialCustom: [''],
      image: ['']
    });
  }

  ngOnInit(): void {
    this.subscribeToCurrentUser();
    this.loadMyProducts();
    this.loadMySales();
    this.startSalesRealtimeRefresh();
    this.startProductsRealtimeRefresh();
  }

  ngOnDestroy(): void {
    this.stopSalesRealtimeRefresh();
    this.stopProductsRealtimeRefresh();
    this.currentUserSubscription?.unsubscribe();
    this.currentUserSubscription = undefined;
  }

  private subscribeToCurrentUser(): void {
    this.currentUserSubscription?.unsubscribe();
    this.currentUserSubscription = this.authService.currentUser$.subscribe((user) => {
      this.user = user;
      if (!user) {
        this.loading = false;
        this.products = [];
        this.sellerSales = [];
        this.refreshSalesData();
        return;
      }

      this.fetchMyProducts(false);
      this.fetchMySales(true);
    });
  }

  setTab(tab: 'add' | 'manage' | 'sales' | 'environmental'): void {
    this.currentTab = tab;
    if (tab === 'sales') {
      this.loadMySales();
    }
    if (tab === 'manage' || tab === 'environmental') {
      this.loadMyProducts();
    }
  }

  loadMySales(): void {
    this.fetchMySales(false);
  }

  private fetchMySales(preserveMessage: boolean): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.sellerSales = [];
      return;
    }

    this.transactionService.getBySeller(Number(currentUser.id)).subscribe({
      next: (sales) => {
        this.sellerSales = sales ?? [];
        if (!preserveMessage) {
          this.salesMessage = '';
        }
        this.refreshSalesData();
      },
      error: () => {
        this.sellerSales = [];
        this.refreshSalesData();
      }
    });
  }

  confirmPendingSale(sale: SellerSale): void {
    const sellerId = Number(this.authService.getCurrentUser()?.id ?? 0);
    if (!sellerId || !sale?.id || !this.isPendingSale(sale)) return;

    this.salesMessage = '';
    this.confirmingSaleIds[sale.id] = true;
    const previousStatus = sale.status;

    // Optimistic UI update for immediate feedback in the seller table.
    this.sellerSales = this.sellerSales.map((currentSale) =>
      Number(currentSale.id) === Number(sale.id)
        ? { ...currentSale, status: 'completed' }
        : currentSale
    );
    this.refreshSalesData();

    this.transactionService.updateSaleStatus(sellerId, sale.id, { status: 'completed' }).subscribe({
      next: () => {
        this.salesMessageType = 'success';
        this.salesMessage = `Commande #${sale.id} confirmee avec succes.`;
        delete this.confirmingSaleIds[sale.id];
        this.fetchMySales(true);
      },
      error: () => {
        this.sellerSales = this.sellerSales.map((currentSale) =>
          Number(currentSale.id) === Number(sale.id)
            ? { ...currentSale, status: previousStatus }
            : currentSale
        );
        this.refreshSalesData();
        this.salesMessageType = 'error';
        this.salesMessage = `Impossible de confirmer la commande #${sale.id}.`;
        delete this.confirmingSaleIds[sale.id];
      }
    });
  }

  private startSalesRealtimeRefresh(): void {
    this.stopSalesRealtimeRefresh();
    this.salesRefreshSubscription = interval(5000).subscribe(() => {
      if (this.currentTab !== 'sales') return;
      this.fetchMySales(true);
    });
  }

  private stopSalesRealtimeRefresh(): void {
    this.salesRefreshSubscription?.unsubscribe();
    this.salesRefreshSubscription = undefined;
  }

  isPendingSale(sale: SellerSale): boolean {
    return String(sale?.status || '').toLowerCase() === 'pending';
  }

  isConfirmingSale(saleId: number): boolean {
    return !!this.confirmingSaleIds[saleId];
  }

  getSaleStatusLabel(status: string): string {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'completed') return 'Confirmee';
    if (normalized === 'pending') return 'En attente';
    if (normalized === 'failed' || normalized === 'refunded') return 'Annulee';
    return status;
  }

  getSaleStatusClass(status: string): string {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'completed') return 'status-badge completed';
    if (normalized === 'pending') return 'status-badge pending';
    if (normalized === 'failed' || normalized === 'refunded') return 'status-badge failed';
    return 'status-badge';
  }

  loadMyProducts(): void {
    this.fetchMyProducts(true);
  }

  private fetchMyProducts(showLoader: boolean): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('Aucun utilisateur authentifié');
      this.loading = false;
      this.products = [];
      return;
    }

    this.user = currentUser;

    console.log(`Chargement des produits du vendeur ID: ${currentUser.id}`);
    if (showLoader) {
      this.loading = true;
    }
    this.productService.getProducts({ page: 1, pageSize: 100, sellerId: currentUser.id }).subscribe({
      next: (response) => {
        console.log('Réponse API:', response);
        const sourceProducts = Array.isArray(response)
          ? response
          : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data)
              ? response.data
              : [];

        const allProducts = (sourceProducts as Product[]).map((product) => this.normalizeProduct(product));
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

  private startProductsRealtimeRefresh(): void {
    this.stopProductsRealtimeRefresh();
    this.productsRefreshSubscription = timer(0, 5000).subscribe(() => {
      if (this.currentTab !== 'manage' && this.currentTab !== 'environmental') return;
      this.fetchMyProducts(false);
    });
  }

  private stopProductsRealtimeRefresh(): void {
    this.productsRefreshSubscription?.unsubscribe();
    this.productsRefreshSubscription = undefined;
  }

  publishProduct(): void {
    if (this.publishForm.invalid) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.loading = true;
    const formValue = this.publishForm.value;
    const imageUrl = String(formValue.image || '').trim();
    const selectedMaterial = String(formValue.material || '');
    const customMaterial = String(formValue.materialCustom || '').trim();
    const material = selectedMaterial === '__custom__' ? customMaterial : selectedMaterial;

    if (!material) {
      alert('Veuillez choisir un materiau ou saisir un materiau personnalise.');
      this.loading = false;
      return;
    }

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
      currency: 'DT',
      condition: formValue.condition,   // déjà en anglais (enum value)
      category: formValue.category,    // déjà en anglais (enum value)
      images: images.length
        ? images
        : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'],
      location: 'Non précisée',
      latitude: 0,
      longitude: 0,
      material,
      isRecycled: undefined,
      isSustainable: undefined
    };

    console.log('📦 Envoi du produit:', productRequest);

    // Appeler l'API pour créer le produit
    this.productService.createProduct(productRequest).subscribe({
      next: (createdProduct) => {
        console.log('✅ Produit créé avec succès:', createdProduct);
        this.loading = false;
        alert('Produit publié avec succès!');
        this.publishForm.reset();
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
    const productMaterial = String(product.material || '').trim();
    const materialExistsInList = this.materials.some((m) => m.value === productMaterial && m.value !== '__custom__');

    this.publishForm.patchValue({
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      condition: product.condition,
      material: materialExistsInList ? productMaterial : '__custom__',
      materialCustom: materialExistsInList ? '' : productMaterial
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

  get completedSalesCount(): number {
    return this.sellerSales.filter((sale) => String(sale.status || '').toLowerCase() === 'completed').length;
  }

  get pendingSalesCount(): number {
    return this.sellerSales.filter((sale) => String(sale.status || '').toLowerCase() === 'pending').length;
  }

  get confirmationRate(): number {
    if (!this.sellerSales.length) return 0;
    return Math.round((this.completedSalesCount / this.sellerSales.length) * 100);
  }

  get averageSalesPerProduct(): number {
    if (!this.totalProducts) return 0;
    return this.totalSales / this.totalProducts;
  }

  get completedRevenueLabel(): string {
    const completedSales = this.sellerSales.filter((sale) => String(sale.status || '').toLowerCase() === 'completed');
    return this.formatCurrencyTotals(this.buildCurrencyTotals(completedSales));
  }

  get pendingRevenueLabel(): string {
    const pendingSales = this.sellerSales.filter((sale) => String(sale.status || '').toLowerCase() === 'pending');
    return this.formatCurrencyTotals(this.buildCurrencyTotals(pendingSales));
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

  get recyclableProductsCount(): number {
    return this.products.filter(p => p.isRecycled).length;
  }

  get sustainableProductsCount(): number {
    return this.products.filter(p => p.isSustainable).length;
  }

  get totalCarbonFootprint(): number {
    return Math.round(this.products.reduce((sum, p) => sum + (p.carbonFootprint || 0), 0) * 10) / 10;
  }

  get ecoScoreLevel(): string {
    const s = this.averageEcoScore;
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Bon';
    if (s >= 40) return 'Moyen';
    return 'Faible';
  }

  get ecoScoreLevelClass(): string {
    const s = this.averageEcoScore;
    if (s >= 80) return 'excellent';
    if (s >= 60) return 'good';
    if (s >= 40) return 'medium';
    return 'low';
  }

  get materialBreakdown(): { material: string; count: number; percentage: number }[] {
    if (!this.products.length) return [];
    const groups: Record<string, number> = {};
    this.products.forEach(p => {
      const mat = p.material || 'Autre';
      groups[mat] = (groups[mat] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([material, count]) => ({
        material,
        count,
        percentage: Math.round((count / this.products.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }

  get topEcoProducts(): { title: string; ecoScore: number; recycledPercentage: number; isRecycled: boolean }[] {
    return [...this.products]
      .sort((a, b) => b.ecoScore - a.ecoScore)
      .slice(0, 6)
      .map(p => ({
        title: p.title,
        ecoScore: p.ecoScore,
        recycledPercentage: p.recycledPercentage || 0,
        isRecycled: p.isRecycled || false
      }));
  }

  get improvementTip(): string {
    if (!this.products.length) return 'Ajoutez des produits pour voir vos statistiques écologiques.';
    const s = this.averageEcoScore;
    if (s >= 80) return 'Excellent ! Continuez à promouvoir vos produits éco-responsables et inspirez d\'autres vendeurs.';
    if (s >= 60) return 'Bon score ! Augmentez le pourcentage de matériaux recyclés pour franchir le palier Excellent.';
    if (s >= 40) return 'Score moyen. Privilégiez des produits reconditionnés et documentez leur durabilité dans les fiches.';
    return 'Score faible. Enrichissez les données écologiques de vos produits et favorisez les articles recyclés.';
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

  formatPriceWithCurrency(price: number, currency?: string): string {
    return `${Number(price || 0).toFixed(2)} DT`;
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

      const confirmedMonthSales = monthSales.filter((sale) => String(sale.status || '').toLowerCase() === 'completed');

      const unitsSold = confirmedMonthSales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0);
      const totalsByCurrency = this.buildCurrencyTotals(confirmedMonthSales);

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
    const total = sales.reduce((sum, sale) => sum + Number(sale.totalPrice || 0), 0);
    return { DT: total };
  }

  private divideCurrencyTotals(totals: Record<string, number>, divisor: number): Record<string, number> {
    if (divisor <= 0) return totals;
    return Object.keys(totals).reduce((acc, currency) => {
      acc[currency] = totals[currency] / divisor;
      return acc;
    }, {} as Record<string, number>);
  }

  private formatCurrencyTotals(totals: Record<string, number>): string {
    return this.formatPriceWithCurrency(totals['DT'] ?? 0, 'DT');
  }

  private getMonthLabel(monthIndex: number): string {
    const labels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    return labels[monthIndex] ?? '-';
  }
}
