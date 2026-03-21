export interface Product {
  id?: number;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  ecoScore?: number;
  isValidated?: boolean;
}
