export interface Product {
  ref: string;
  description: string;
  sizes: string[];
  price: number; // Default price (usually dozen)
  unitPrice?: number;
  dozenPrice?: number;
  imageUrl?: string;
}

export interface CustomerInfo {
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  cnpj: string;
  ie: string;
  email: string;
  phone: string;
}

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
  unitType: 'DUZIA' | 'UNIDADE';
}
