import { Component } from '@angular/core';
import { ProductListComponent } from './product-list.component';
import { ProductFormComponent } from './product-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ProductListComponent, ProductFormComponent],
  template: `
    <div class="container">
      <h1>EcoMarketplace - Angular Client</h1>
      <product-form (created)="onCreated()"></product-form>
      <product-list #list></product-list>
    </div>
  `
})
export class AppComponent {
  onCreated() {
    // noop - child components handle refresh via events
  }
}
