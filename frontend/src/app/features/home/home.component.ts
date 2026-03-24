import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly slides = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
      title: 'Maison responsable',
      subtitle: 'Materiaux reutilises',
      impactTitle: 'Consommation optimisee',
      impactSubtitle: 'Choix plus durables'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1200&q=80',
      title: 'Alimentation locale',
      subtitle: 'Circuit court • Frais',
      impactTitle: 'Moins de transport',
      impactSubtitle: 'Emission CO2 diminuee'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80',
      title: 'Produit durable',
      subtitle: 'EcoScore 91 • Excellent',
      impactTitle: 'Impact CO2 reduit',
      impactSubtitle: 'Empreinte mieux maitrisee'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80',
      title: 'Mode eco',
      subtitle: 'Textile recycle • Qualite',
      impactTitle: 'Dechets reduits',
      impactSubtitle: 'Impact environnemental moindre'
    }
  ];

  activeSlideIndex = 0;
  private autoSlideTimer: ReturnType<typeof setInterval> | null = null;

  get activeSlide() {
    return this.slides[this.activeSlideIndex];
  }

  ngOnInit(): void {
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  nextSlide(): void {
    this.activeSlideIndex = (this.activeSlideIndex + 1) % this.slides.length;
  }

  prevSlide(): void {
    this.activeSlideIndex = (this.activeSlideIndex - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number): void {
    if (index < 0 || index >= this.slides.length) return;
    this.activeSlideIndex = index;
    this.restartAutoSlide();
  }

  onNextClick(): void {
    this.nextSlide();
    this.restartAutoSlide();
  }

  onPrevClick(): void {
    this.prevSlide();
    this.restartAutoSlide();
  }

  private startAutoSlide(): void {
    this.stopAutoSlide();
    this.autoSlideTimer = setInterval(() => {
      this.nextSlide();
    }, 3500);
  }

  private stopAutoSlide(): void {
    if (!this.autoSlideTimer) return;
    clearInterval(this.autoSlideTimer);
    this.autoSlideTimer = null;
  }

  private restartAutoSlide(): void {
    this.startAutoSlide();
  }
}
