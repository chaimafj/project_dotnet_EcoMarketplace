import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../Services/auth.service';
import { CreateProductRequest, Product, ProductService } from '../../Services/product.service';
import { UserService } from '../../Services/user.service';

@Component({
  standalone: true,
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);

  activeTab: 'profile' | 'publish' | 'products' = 'profile';
  savingProfile = false;
  savingProduct = false;
  loadingProducts = false;
  profileMessage = '';
  productMessage = '';
  products: Product[] = [];
  avatarPreview: string | null = null;
  productImagePreviews: string[] = [];

  profileForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: [{ value: '', disabled: true }],
  });

  publishForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    price: [0, [Validators.required, Validators.min(1)]],
    category: ['Electronics', Validators.required],
    condition: ['Good', Validators.required],
    material: ['Recycled plastic', Validators.required],
    location: ['Tunis', Validators.required],
    imageUrl: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', Validators.required],
    isRecycled: [true],
    isSustainable: [true],
    carbonFootprint: [12, [Validators.required, Validators.min(0)]],
    recycledPercentage: [60, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  categories = ['Electronics', 'Textile', 'Furniture', 'Books', 'Sports', 'Other'];
  conditions = ['New', 'LikeNew', 'Good', 'Fair'];

  constructor(
    public authService: AuthService,
    private productService: ProductService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.syncProfileForm();
    this.loadMyProducts();
  }

  syncProfileForm(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.profileForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
  }

  saveProfile(): void {
    const user = this.authService.getCurrentUser();
    if (!user || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const firstName = this.profileForm.getRawValue().firstName?.trim() ?? '';
    const lastName = this.profileForm.getRawValue().lastName?.trim() ?? '';
    const displayName = `${firstName} ${lastName}`.trim();
    const profilePictureUrl = this.avatarPreview || user.profilePictureUrl;

    this.savingProfile = true;
    this.profileMessage = '';

    this.userService.updateUser(user.id, { displayName, firstName, lastName, profilePictureUrl }).subscribe({
      next: () => {
        this.authService.updateCurrentUser({
          ...user,
          firstName,
          lastName,
          profilePictureUrl,
        });
        this.profileMessage = 'Profil mis a jour avec succes.';
        this.savingProfile = false;
      },
      error: () => {
        this.profileMessage = 'Mise a jour impossible pour le moment.';
        this.savingProfile = false;
      }
    });
  }

  publishProduct(): void {
    const user = this.authService.getCurrentUser();
    if (!user || this.publishForm.invalid) {
      this.publishForm.markAllAsTouched();
      return;
    }

    this.savingProduct = true;
    this.productMessage = '';

    const formValue = this.publishForm.getRawValue();
    const rawUrl = (formValue.imageUrl ?? '').trim();
    const images = [
      ...this.productImagePreviews,
      ...(rawUrl ? [rawUrl] : [])
    ];

    const payload: CreateProductRequest = {
      sellerId: user.id,
      title: formValue.title ?? '',
      description: formValue.description ?? '',
      price: Number(formValue.price ?? 0),
      currency: 'DT',
      condition: formValue.condition ?? 'Good',
      category: formValue.category ?? 'Electronics',
      images: images.length
        ? images
        : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'],
      location: formValue.location ?? 'Tunis',
      latitude: 36.8065,
      longitude: 10.1815,
      material: formValue.material ?? 'Recycled plastic',
      isRecycled: !!formValue.isRecycled,
      isSustainable: !!formValue.isSustainable,
      carbonFootprint: Number(formValue.carbonFootprint ?? 0),
      recycledPercentage: Number(formValue.recycledPercentage ?? 0),
    };

    this.productService.createProduct(payload).subscribe({
      next: () => {
        this.productMessage = 'Produit publie avec succes.';
        this.savingProduct = false;
        this.publishForm.patchValue({
          title: '',
          description: '',
          price: 0,
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
        });
        this.productImagePreviews = [];
        this.loadMyProducts();
      },
      error: () => {
        this.productMessage = 'Publication impossible pour le moment.';
        this.savingProduct = false;
      }
    });
  }

  loadMyProducts(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.products = [];
      return;
    }

    this.loadingProducts = true;
    this.productService.getProducts({ page: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        const allProducts = (response?.items ?? []) as Product[];
        const userId = String(user.id);
        this.products = allProducts.filter((product) => String(product.sellerId) === userId);
        this.loadingProducts = false;
      },
      error: () => {
        this.products = [];
        this.loadingProducts = false;
      }
    });
  }

  get averageEcoScore(): number {
    if (!this.products.length) return 0;
    return Math.round(this.products.reduce((sum, product) => sum + product.ecoScore, 0) / this.products.length);
  }

  setTab(tab: 'profile' | 'publish' | 'products'): void {
    this.activeTab = tab;
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('Image trop lourde (max 5 Mo).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarPreview = null;
  }

  onProductPhotosChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const maxSize = 8 * 1024 * 1024;
    const accepted = [...input.files].filter((file) => file.type.startsWith('image/') && file.size <= maxSize);

    if (!accepted.length) {
      this.productMessage = 'Aucune image valide selectionnee (images <= 8 Mo).';
      return;
    }

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

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://placehold.co/400x260/e8f5e9/1a7c50?text=Produit';
  }
}
