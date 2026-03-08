/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Send, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Package,
  LogOut,
  Eye,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { products } from './data/products';
import { CustomerInfo, CartItem, Product } from './types';

const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  return `${import.meta.env.BASE_URL}${cleanUrl}`;
};

const STEPS = {
  CUSTOMER_INFO: 'customer_info',
  PRODUCT_SELECTION: 'product_selection',
  CART_REVIEW: 'cart_review',
  SUCCESS: 'success'
};

export default function App() {
  const [step, setStep] = useState(STEPS.PRODUCT_SELECTION);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    address: '',
    neighborhood: '',
    city: '',
    state: 'PR',
    zip: '',
    cnpj: '',
    ie: '',
    email: '',
    phone: ''
  });
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [selectedProductImage, setSelectedProductImage] = useState<Product | null>(null);
  const [isCnpjFetched, setIsCnpjFetched] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const cnpjInputRef = useRef<HTMLInputElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === STEPS.PRODUCT_SELECTION) {
      setSearchTerm('');
      setSelectedCategory('Todas');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsZoomed(false);
  }, [step]);

  const categories = ['Todas', 'Cuecas', 'Tangas & Fios', 'Calçolas & Calças', 'Conjuntos & Tops', 'Fitness', 'Pijamas & Noite'];

  const getProductCategory = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('cueca') || desc.includes('sungão')) return 'Cuecas';
    if (desc.includes('tanga') || desc.includes('fio dental')) return 'Tangas & Fios';
    if (desc.includes('calçola') || desc.includes('calça') || desc.includes('tangão')) return 'Calçolas & Calças';
    if (desc.includes('conjunto') || desc.includes('top') || desc.includes('soutien')) return 'Conjuntos & Tops';
    if (desc.includes('fitness') || desc.includes('short') || desc.includes('camiseta') || desc.includes('fusô')) return 'Fitness';
    if (desc.includes('pijama') || desc.includes('camisola') || desc.includes('doll')) return 'Pijamas & Noite';
    return 'Outros';
  };

  const generateOrderNumber = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const isFormValid = useMemo(() => {
    const cleanCnpj = customer.cnpj.replace(/\D/g, '');
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const cleanZip = customer.zip.replace(/\D/g, '');

    return (
      customer.name.trim() !== '' &&
      customer.email.trim() !== '' &&
      cleanPhone.length >= 10 && 
      cleanCnpj.length === 14 &&
      customer.ie.trim() !== '' &&
      cleanZip.length === 8 &&
      customer.address.trim() !== '' &&
      customer.neighborhood.trim() !== '' &&
      customer.city.trim() !== '' &&
      paymentMethod !== ''
    );
  }, [customer, paymentMethod]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.description.toLowerCase().includes(searchTerm.toLowerCase()) || p.ref.includes(searchTerm);
      const matchesCategory = selectedCategory === 'Todas' || getProductCategory(p.description) === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const totalValue = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.unitType === 'DUZIA' ? item.product.price : (item.product.unitPrice || item.product.price / 12);
      return acc + (price * item.quantity);
    }, 0);
  }, [cart]);

  const paymentOptions = useMemo(() => {
    const options = [{ id: 'avista', label: 'À Vista (6% desc)' }];
    if (totalValue > 0) {
      if (totalValue <= 2800) {
        options.push({ id: '3060', label: '30/60 dias' });
      } else {
        options.push({ id: '306090', label: '30/60/90 dias' });
      }
    }
    return options;
  }, [totalValue]);

  const finalTotal = useMemo(() => {
    let total = totalValue;
    if (paymentMethod === 'avista') {
      total = totalValue * 0.94;
    }
    // Add shipping cost if FOB (totalValue <= 2800)
    if (totalValue > 0 && totalValue <= 2800) {
      total += 80;
    }
    return total;
  }, [totalValue, paymentMethod]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'phone') maskedValue = maskPhone(value);
    if (name === 'cnpj') maskedValue = maskCNPJ(value);
    if (name === 'zip') maskedValue = maskCEP(value);
    if (name === 'ie') maskedValue = value.slice(0, 14);

    setCustomer(prev => ({ ...prev, [name]: maskedValue }));
  };

  const addToCart = (product: Product, size: string, quantity: number, unitType: 'DUZIA' | 'UNIDADE') => {
    if (quantity <= 0) return;
    
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.ref === product.ref && item.size === size && item.unitType === unitType);
      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += quantity;
        return newCart;
      }
      return [...prev, { product, size, quantity, unitType }];
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const newQty = newCart[index].quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      newCart[index].quantity = newQty;
      return newCart;
    });
  };

  const isValidCNPJ = (value: string) => {
    if (!value) return false;
    const cnpj = value.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;

    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    const digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
  };

  const fetchCNPJData = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    if (!isValidCNPJ(cleanCnpj)) {
      setCnpjError('CNPJ Inválido');
      setCustomer(prev => ({ ...prev, cnpj: '' }));
      setTimeout(() => {
        cnpjInputRef.current?.focus();
      }, 100);
      return;
    }

    setIsCnpjLoading(true);
    setCnpjError('');
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error('CNPJ não encontrado');
      const data = await response.json();
      
      setCustomer(prev => ({
        ...prev,
        name: data.razao_social || data.nome_fantasia || prev.name,
        address: `${data.logradouro}${data.numero ? ', ' + data.numero : ''}${data.complemento ? ' - ' + data.complemento : ''}`,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.municipio || prev.city,
        state: data.uf || 'PR',
        zip: data.cep || prev.zip,
        email: data.email || prev.email,
        phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0,2)}) ${data.ddd_telefone_1.substring(2)}` : prev.phone
      }));
      setIsCnpjFetched(true);
    } catch (err) {
      console.error(err);
      setCnpjError('Erro ao buscar CNPJ. Verifique o número ou preencha manualmente.');
      // Permite preencher manualmente se der erro
      setIsCnpjFetched(true);
    } finally {
      setIsCnpjLoading(false);
    }
  };

  const handleExit = () => {
    if (window.confirm('Deseja realmente sair e encerrar o pedido? Todos os dados serão perdidos.')) {
      setCart([]);
      setPaymentMethod('');
      setOrderNumber('');
      setObservations('');
      setCustomer({
        name: '',
        address: '',
        neighborhood: '',
        city: '',
        state: 'PR',
        zip: '',
        cnpj: '',
        ie: '',
        email: '',
        phone: ''
      });
      setIsCnpjFetched(false);
      setStep(STEPS.PRODUCT_SELECTION);
      
      // Tenta fechar a janela do navegador de forma robusta
      try {
        window.open('', '_self', '');
        window.close();
        
        // Fallback para navegadores que bloqueiam window.close()
        setTimeout(() => {
          if (!window.closed) {
            window.location.href = "about:blank";
          }
        }, 100);
      } catch (e) {
        window.location.href = "about:blank";
      }
    }
  };

  const sendOrder = () => {
    const representativePhone = '5543999526727';
    const newOrderNum = generateOrderNumber();
    setOrderNumber(newOrderNum);
    
    const separator = "------------------------------------------";
    
    let message = `📦 *PEDIDO #${newOrderNum} - LOBACK CONFECÇÕES*\n`;
    message += `${separator}\n\n`;
    
    message += `👤 *DADOS DO CLIENTE*\n`;
    message += `Nome: ${customer.name}\n`;
    message += `CNPJ: ${customer.cnpj}\n`;
    message += `IE: ${customer.ie}\n`;
    message += `Endereço: ${customer.address}\n`;
    message += `Bairro: ${customer.neighborhood}\n`;
    message += `Cidade: ${customer.city}\n`;
    message += `UF: ${customer.state}\n`;
    message += `CEP: ${customer.zip}\n`;
    message += `Email: ${customer.email}\n`;
    message += `Telefone: ${customer.phone}\n\n`;
    
    message += `${separator}\n`;
    message += `🛒 *ITENS DO PEDIDO*\n`;
    message += `${separator}\n`;
    
    cart.forEach(item => {
      const price = item.unitType === 'DUZIA' ? item.product.price : (item.product.unitPrice || item.product.price / 12);
      const unitLabel = item.unitType === 'DUZIA' ? 'dz' : 'un';
      message += `✅ [REF: ${item.product.ref}] ${item.product.description}\n`;
      message += `   Tam: ${item.size} | Qtd: ${item.quantity} ${unitLabel}\n`;
      message += `   Vlr ${unitLabel}: R$ ${price.toFixed(2)} | Sub: R$ ${(price * item.quantity).toFixed(2)}\n`;
      message += `${separator}\n`;
    });
    
    const selectedOption = paymentOptions.find(opt => opt.id === paymentMethod);
    const isFob = totalValue <= 2800;
    const shippingInfo = !isFob ? 'FRETE CIF' : 'FRETE FOB (R$ 80,00)';
    message += `\n💰 *RESUMO DO PAGAMENTO*\n`;
    message += `• Forma: ${selectedOption?.label || 'Não informada'}\n`;
    message += `• Frete: ${shippingInfo}\n`;
    
    if (paymentMethod === 'avista') {
      message += `• Subtotal: R$ ${totalValue.toFixed(2)}\n`;
      message += `• Desconto (6%): R$ ${(totalValue * 0.06).toFixed(2)}\n`;
    }

    if (isFob) {
      message += `• Valor do Frete: R$ 80,00\n`;
    }
    
    message += `• *TOTAL FINAL: R$ ${finalTotal.toFixed(2)}*\n\n`;
    message += `${separator}\n`;

    if (observations.trim()) {
      message += `\n📝 *OBSERVAÇÕES:*\n${observations}\n\n`;
      message += `${separator}\n`;
    }
    
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    message += `_Gerado por Pedro Pimenta Representações_\n`;
    message += `_By Loback Confecções_\n`;
    message += `_Data: ${formattedDate} às ${formattedTime}_`;
    
    // WhatsApp
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${representativePhone}?text=${encodedMessage}`, '_blank');

    setStep(STEPS.SUCCESS);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-[#1a1a1a]/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-[#5A5A40]/20 rounded-full flex items-center justify-center text-[#5A5A40] font-serif font-bold text-xl">
              PP
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 leading-none mb-0.5">Representante</p>
                <h2 className="text-lg font-bold tracking-tight">Pedro Pimenta</h2>
              </div>
              <div className="h-6 w-px bg-[#1a1a1a]/10 hidden sm:block" />
              <p className="text-[11px] font-medium opacity-60 hidden sm:block">
                By <span className="font-bold">Loback Confecções</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {cart.length > 0 && (
              <button 
                onClick={() => setStep(STEPS.CART_REVIEW)}
                className="relative p-2 hover:bg-[#f5f5f0] rounded-full transition-colors"
              >
                <ShoppingBag size={24} />
                <span className="absolute top-0 right-0 bg-[#5A5A40] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {step === STEPS.CUSTOMER_INFO && (
            <motion.div
              key="customer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="font-serif text-3xl font-bold">Informações do Cliente</h2>
                <p className="text-sm opacity-60">Confirme seus dados para finalizar o pedido</p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#1a1a1a]/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input 
                        ref={cnpjInputRef}
                        label="CNPJ" 
                        name="cnpj" 
                        placeholder="00.000.000/0000-00" 
                        value={customer.cnpj} 
                        onChange={handleCustomerChange} 
                        icon={<CreditCard size={18}/>} 
                        required 
                        disabled={isCnpjLoading}
                      />
                    </div>
                    {!isCnpjFetched ? (
                      <button
                        onClick={() => fetchCNPJData(customer.cnpj)}
                        disabled={isCnpjLoading || customer.cnpj.replace(/\D/g, '').length !== 14}
                        className="bg-[#5A5A40] text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-[#4a4a34] transition-all disabled:opacity-30 disabled:cursor-not-allowed h-[52px]"
                      >
                        {isCnpjLoading ? 'Buscando...' : 'Buscar'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsCnpjFetched(false);
                          setCnpjError('');
                          setCustomer(prev => ({ ...prev, cnpj: '' }));
                          setTimeout(() => {
                            cnpjInputRef.current?.focus();
                          }, 100);
                        }}
                        className="bg-white text-[#5A5A40] border border-[#5A5A40]/20 px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-[#f5f5f0] transition-all h-[52px]"
                      >
                        Alterar
                      </button>
                    )}
                  </div>
                  {cnpjError && <p className="text-[10px] text-red-500 font-bold ml-1">{cnpjError}</p>}
                </div>

                {isCnpjFetched && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <Input label="Nome Completo / Razão Social" name="name" value={customer.name} onChange={handleCustomerChange} icon={<User size={18}/>} required />
                    <Input label="Email" name="email" type="email" value={customer.email} onChange={handleCustomerChange} icon={<Mail size={18}/>} required />
                    <Input label="Telefone" name="phone" placeholder="(00) 00000-0000" value={customer.phone} onChange={handleCustomerChange} icon={<Phone size={18}/>} required />
                    <Input label="Inscrição Estadual" name="ie" type="text" placeholder="Apenas números" value={customer.ie} onChange={handleCustomerChange} icon={<CreditCard size={18}/>} maxLength={14} required />
                    <Input label="CEP" name="zip" placeholder="00000-000" value={customer.zip} onChange={handleCustomerChange} icon={<MapPin size={18}/>} required />
                    <div className="md:col-span-2">
                      <Input label="Endereço" name="address" value={customer.address} onChange={handleCustomerChange} icon={<MapPin size={18}/>} required />
                    </div>
                    <Input label="Bairro" name="neighborhood" value={customer.neighborhood} onChange={handleCustomerChange} required />
                    <div className="md:col-span-2">
                      <Input label="Cidade" name="city" value={customer.city} onChange={handleCustomerChange} required />
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setStep(STEPS.CART_REVIEW)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-[#5A5A40] border border-[#5A5A40]/20 px-12 py-4 rounded-full font-medium hover:bg-[#5A5A40] hover:text-white transition-all shadow-sm"
                >
                  <ChevronLeft size={18} />
                  Voltar ao Carrinho
                </button>
                <button
                  onClick={sendOrder}
                  disabled={!isFormValid}
                  className="w-full sm:w-auto bg-[#25D366] text-white px-12 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:bg-[#128C7E] transition-all shadow-xl shadow-[#25D366]/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Send size={20} />
                  Enviar Pedido
                </button>
              </div>
            </motion.div>
          )}

          {step === STEPS.PRODUCT_SELECTION && (
            <motion.div
              key="products"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <button 
                      onClick={() => setStep(STEPS.CUSTOMER_INFO)}
                      className="mt-1 p-2 hover:bg-white rounded-full transition-colors"
                      title="Voltar para informações do cliente"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <div className="space-y-1 flex-1 min-w-0">
                      <h2 className="font-serif text-3xl font-bold truncate">Catálogo de Produtos</h2>
                      <p className="text-sm opacity-60 leading-tight break-words">Selecione os itens e tamanhos desejados (Venda por Dúzia e Unidade)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleExit();
                      }}
                      className="flex items-center gap-2 bg-white text-[#5A5A40] border border-[#5A5A40]/20 px-4 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#5A5A40] hover:text-white transition-all shadow-sm"
                    >
                      <LogOut size={14} />
                      Sair
                    </button>
                    <div className="relative flex-1 md:flex-none">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 bg-white rounded-full border border-[#1a1a1a]/10 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-bold transition-all border ${
                        selectedCategory === cat
                          ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-md'
                          : 'bg-white text-[#1a1a1a] border-[#1a1a1a]/10 hover:border-[#5A5A40]/30'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.ref} 
                    product={product} 
                    onAdd={addToCart} 
                    onViewImage={setSelectedProductImage} 
                  />
                ))}
              </div>

              {/* Floating Cart Summary */}
              {cart.length > 0 && (
                <motion.div 
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md"
                >
                  <div className="bg-[#5A5A40] text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <ShoppingBag size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider opacity-60 leading-none mb-1">Total Parcial</p>
                        <p className="text-lg font-bold leading-none">R$ {totalValue.toFixed(2)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep(STEPS.CART_REVIEW)}
                      className="bg-white text-[#5A5A40] px-6 py-3 rounded-full font-bold text-sm hover:bg-[#f5f5f0] transition-all flex items-center gap-2"
                    >
                      Ver Pedido
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === STEPS.CART_REVIEW && (
            <motion.div
              key="cart"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep(STEPS.PRODUCT_SELECTION)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 className="font-serif text-3xl font-bold">Seu Carrinho</h2>
              </div>

              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#1a1a1a]/5">
                {cart.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <ShoppingBag size={48} className="mx-auto opacity-20" />
                    <p className="opacity-60">Seu carrinho está vazio.</p>
                    <button 
                      onClick={() => setStep(STEPS.PRODUCT_SELECTION)}
                      className="text-[#5A5A40] font-medium underline underline-offset-4"
                    >
                      Voltar ao catálogo
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-[#1a1a1a]/5">
                      {cart.map((item, index) => {
                        const price = item.unitType === 'DUZIA' ? item.product.price : (item.product.unitPrice || item.product.price / 12);
                        const unitLabel = item.unitType === 'DUZIA' ? 'dz' : 'un';
                        return (
                          <div key={`${item.product.ref}-${item.size}-${item.unitType}`} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold bg-[#f5f5f0] px-2 py-0.5 rounded uppercase opacity-60">Ref: {item.product.ref}</span>
                                <span className="text-[10px] font-bold bg-[#5A5A40]/10 text-[#5A5A40] px-2 py-0.5 rounded uppercase">Tam: {item.size}</span>
                                <span className="text-[10px] font-bold bg-[#1a1a1a]/10 text-[#1a1a1a] px-2 py-0.5 rounded uppercase">{item.unitType}</span>
                              </div>
                              <h3 className="font-medium text-sm sm:text-base">{item.product.description}</h3>
                              <p className="text-xs sm:text-sm opacity-60">R$ {price.toFixed(2)} / {unitLabel}</p>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                              <div className="flex items-center bg-[#f5f5f0] rounded-full p-1">
                                <button 
                                  onClick={() => updateQuantity(index, -1)}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full transition-colors"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="w-12 text-center font-medium text-xs sm:text-sm">{item.quantity} {unitLabel}</span>
                                <button 
                                  onClick={() => updateQuantity(index, 1)}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full transition-colors"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <div className="text-right min-w-[70px] sm:min-w-[80px]">
                                <p className="font-bold text-sm sm:text-base">R$ {(price * item.quantity).toFixed(2)}</p>
                              </div>
                              <button 
                                onClick={() => removeFromCart(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="bg-[#f5f5f0]/50 p-8 flex flex-col items-end gap-2">
                      <p className="text-sm opacity-60">Subtotal do Pedido</p>
                      <p className="text-2xl font-serif font-bold">R$ {totalValue.toFixed(2)}</p>
                    </div>

                    <div className="p-8 space-y-6 border-t border-[#1a1a1a]/5">
                      <div ref={paymentSectionRef} className={`space-y-4 p-4 rounded-3xl transition-all duration-500 ${!paymentMethod ? 'bg-[#5A5A40]/5 ring-2 ring-[#5A5A40]/20 animate-pulse' : ''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className="text-[11px] uppercase tracking-wider font-bold text-[#5A5A40]">1. Escolha a Forma de Pagamento</p>
                          {!paymentMethod && (
                            <span className="text-[10px] font-bold text-red-500 animate-bounce">Ação Necessária!</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {paymentOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => setPaymentMethod(option.id)}
                              className={`px-6 py-3 rounded-2xl text-sm font-medium transition-all border ${
                                paymentMethod === option.id
                                  ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-md'
                                  : 'bg-white text-[#1a1a1a] border-[#1a1a1a]/10 hover:border-[#5A5A40]/30'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {paymentMethod === 'avista' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-green-50 text-green-700 p-4 rounded-2xl text-sm flex justify-between items-center"
                        >
                          <span>Desconto de 6% aplicado!</span>
                          <span className="font-bold">- R$ {(totalValue * 0.06).toFixed(2)}</span>
                        </motion.div>
                      )}

                      <div className="flex flex-col items-end pt-4 border-t border-[#1a1a1a]/5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] uppercase tracking-wider font-bold opacity-40">Frete:</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${totalValue > 2800 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {totalValue > 2800 ? 'FRETE CIF' : 'FRETE FOB (R$ 80,00)'}
                          </span>
                        </div>
                        {totalValue > 0 && totalValue <= 2800 && (
                          <p className="text-[10px] text-blue-700 font-medium mb-2">Valor do frete incluso no total</p>
                        )}
                        <p className="text-sm opacity-60">Valor Total Final</p>
                        <p className="text-4xl font-serif font-bold text-[#5A5A40]">R$ {finalTotal.toFixed(2)}</p>
                      </div>

                      <div className="pt-6 border-t border-[#1a1a1a]/5 space-y-2">
                        <p className="text-[10px] uppercase tracking-wider font-bold opacity-40">Observações do Pedido</p>
                        <textarea
                          value={observations}
                          onChange={(e) => setObservations(e.target.value)}
                          placeholder="Caso precise, adicione aqui informações importantes sobre o seu pedido..."
                          className="w-full bg-[#f5f5f0] border border-[#1a1a1a]/5 rounded-2xl p-4 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/10 focus:bg-white transition-all resize-none"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {cart.length > 0 && (
                <div className="flex flex-col items-center gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    <button
                      onClick={() => setStep(STEPS.PRODUCT_SELECTION)}
                      className="bg-white text-[#5A5A40] border border-[#5A5A40] px-8 py-5 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-[#5A5A40]/5 transition-all"
                    >
                      Continuar Comprando
                    </button>
                    <button
                      onClick={() => {
                        if (!paymentMethod) {
                          paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          return;
                        }
                        setStep(STEPS.CUSTOMER_INFO);
                      }}
                      className={`w-full px-8 py-5 rounded-full font-bold flex items-center justify-center gap-3 transition-all shadow-xl ${
                        paymentMethod 
                          ? 'bg-[#5A5A40] text-white hover:bg-[#4a4a34] shadow-[#5A5A40]/20' 
                          : 'bg-white text-[#5A5A40] border-2 border-[#5A5A40] opacity-80'
                      }`}
                    >
                      {paymentMethod ? (
                        <>
                          <ChevronRight size={20} />
                          Finalizar Compra
                        </>
                      ) : (
                        <>
                          <CreditCard size={20} />
                          Escolha o Pagamento Acima
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === STEPS.SUCCESS && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto space-y-8 py-12"
            >
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={48} />
                </div>
                <div className="space-y-2">
                  <h2 className="font-serif text-4xl font-bold">Pedido Enviado!</h2>
                  <p className="text-xl font-medium text-[#5A5A40]">Número do Pedido: #{orderNumber}</p>
                  <p className="opacity-60">Seu pedido foi processado e enviado via WhatsApp.</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-[#1a1a1a]/5 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-[#1a1a1a]/5">
                  <Package className="text-[#5A5A40]" size={24} />
                  <h3 className="font-bold">Resumo do Pedido</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-60">Cliente:</span>
                    <span className="font-medium">{customer.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-60">Itens:</span>
                    <span className="font-medium">{cart.reduce((acc, item) => acc + item.quantity, 0)} dúzias</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-60">Forma de Pagamento:</span>
                    <span className="font-medium">{paymentOptions.find(o => o.id === paymentMethod)?.label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-60">Frete:</span>
                    <span className={`font-bold ${totalValue > 2800 ? 'text-green-600' : 'text-blue-600'}`}>
                      {totalValue > 2800 ? 'FRETE CIF' : 'FRETE FOB (R$ 80,00)'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-4 border-t border-[#1a1a1a]/5">
                    <span className="font-bold">Total Final:</span>
                    <span className="font-bold text-xl text-[#5A5A40]">R$ {finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleExit}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-[#5A5A40] border border-[#5A5A40]/20 px-12 py-4 rounded-full font-medium hover:bg-[#5A5A40] hover:text-white transition-all shadow-sm"
                >
                  <LogOut size={18} />
                  Sair
                </button>
                <button
                  onClick={() => {
                    setCart([]);
                    setPaymentMethod('');
                    setOrderNumber('');
                    setObservations('');
                    setIsCnpjFetched(false);
                    setCnpjError('');
                    setCustomer({
                      name: '',
                      address: '',
                      neighborhood: '',
                      city: '',
                      state: 'PR',
                      zip: '',
                      cnpj: '',
                      ie: '',
                      email: '',
                      phone: ''
                    });
                    setStep(STEPS.PRODUCT_SELECTION);
                  }}
                  className="w-full sm:w-auto bg-[#5A5A40] text-white px-12 py-4 rounded-full font-medium hover:bg-[#4a4a34] transition-all shadow-lg shadow-[#5A5A40]/20"
                >
                  Fazer Novo Pedido
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedProductImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setSelectedProductImage(null);
              setIsZoomed(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setSelectedProductImage(null);
                  setIsZoomed(false);
                }}
                className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white rounded-full text-[#1a1a1a] transition-all shadow-lg"
              >
                <X size={24} />
              </button>
              
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2 bg-[#f5f5f0] flex items-center justify-center p-8 relative overflow-hidden">
                  {selectedProductImage.imageUrl ? (
                    <div className={`relative w-full h-full flex items-center justify-center transition-all duration-300 ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}>
                      <div className={`relative transition-transform duration-300 ease-in-out ${isZoomed ? 'scale-[2] z-20' : 'scale-100'}`}>
                        <img 
                          src={getImageUrl(selectedProductImage.imageUrl)} 
                          alt={selectedProductImage.description}
                          className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsZoomed(!isZoomed);
                          }}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsZoomed(!isZoomed);
                        }}
                        className="absolute bottom-4 right-4 z-30 p-3 bg-white/90 hover:bg-white rounded-full text-[#5A5A40] transition-all shadow-lg border border-[#5A5A40]/10"
                        title={isZoomed ? "Diminuir Zoom" : "Aumentar Zoom"}
                      >
                        {isZoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                      </button>
                      <div className="hidden w-full aspect-square bg-[#e6e6e1] rounded-xl flex-col items-center justify-center text-[#5A5A40]/40 gap-2">
                        <Package size={48} />
                        <p className="text-xs font-bold uppercase tracking-widest">Imagem não disponível</p>
                        <p className="text-[10px] opacity-60">(Arquivo vazio ou corrompido)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-[#e6e6e1] rounded-xl flex flex-col items-center justify-center text-[#5A5A40]/40 gap-2">
                      <Package size={48} />
                      <p className="text-xs font-bold uppercase tracking-widest">Imagem não disponível</p>
                    </div>
                  )}
                </div>
                <div className="md:w-1/2 p-8 space-y-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold bg-[#f5f5f0] px-2 py-0.5 rounded uppercase opacity-60">Ref: {selectedProductImage.ref}</span>
                    <h2 className="font-serif text-3xl font-bold">{selectedProductImage.description}</h2>
                    <p className="text-2xl font-serif font-bold text-[#5A5A40]">R$ {selectedProductImage.price.toFixed(2)} <span className="text-xs opacity-40 uppercase font-sans">/ Dúzia</span></p>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold opacity-40">Tamanhos Disponíveis</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProductImage.sizes.map(size => (
                        <span key={size} className="px-4 py-2 bg-[#f5f5f0] rounded-xl text-xs font-bold">
                          {size}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#1a1a1a]/5">
                    <button
                      onClick={() => setSelectedProductImage(null)}
                      className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4a4a34] transition-all shadow-lg shadow-[#5A5A40]/20"
                    >
                      Fechar Visualização
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="max-w-4xl mx-auto px-4 py-12 border-t border-[#1a1a1a]/5 text-center space-y-6">
        <div className="flex flex-col items-center justify-center gap-1">
          <h2 className="text-sm font-bold tracking-tight">Pedro Pimenta</h2>
          <p className="text-[10px] uppercase tracking-widest opacity-40">Representante</p>
          <p className="text-[11px] font-medium opacity-60 mt-1">
            By <span className="font-bold">Loback Confecções</span>
          </p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 space-y-3">
          <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2">Informações Importantes</p>
          <div className="text-[10px] text-red-600 leading-relaxed space-y-1 text-left md:text-center max-w-2xl mx-auto font-medium">
            <p>- Kits M/M são padronizados (sem alteração).</p>
            <p>- Acima de R$ 2.800,00: 30/60/90 (frete CIF).</p>
            <p>- Até R$ 2.800,00: 30/60 (frete FOB - R$ 80,00).</p>
            <p>- À vista: 6% desc.</p>
            <p>- Cores lisas, estampadas ou sortidas, sujeitas à disponibilidade em estoque.</p>
            <p>- Produtos com código de barras geram crédito de ICMS.</p>
          </div>
        </div>
        <div className="pt-8 border-t border-[#1a1a1a]/5">
          <p className="text-[10px] uppercase tracking-widest opacity-30 font-medium">
            Desenvolvido por <span className="font-bold">AQCI Solutions</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, icon, required, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider font-bold opacity-40 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">{icon}</div>}
        <input
          {...props}
          ref={ref}
          required={required}
          className={`w-full bg-[#f5f5f0] border border-[#1a1a1a]/5 rounded-2xl py-3 ${icon ? 'pl-11' : 'pl-4'} pr-4 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/10 focus:bg-white transition-all`}
        />
      </div>
    </div>
  );
});

Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: React.ReactNode;
  options: string[];
  required?: boolean;
}

const Select: React.FC<SelectProps> = ({ label, icon, options, required, ...props }) => {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider font-bold opacity-40 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 z-10">{icon}</div>}
        <select
          {...props}
          required={required}
          className={`w-full bg-[#f5f5f0] border border-[#1a1a1a]/5 rounded-2xl py-3 ${icon ? 'pl-11' : 'pl-4'} pr-10 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/10 focus:bg-white transition-all appearance-none cursor-pointer`}
        >
          <option value="">Selecione...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
          <ChevronRight size={16} className="rotate-90" />
        </div>
      </div>
    </div>
  );
};

interface ProductCardProps {
  product: Product;
  onAdd: (p: Product, s: string, q: number, ut: 'DUZIA' | 'UNIDADE') => void;
  onViewImage: (p: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd, onViewImage }) => {
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [quantity, setQuantity] = useState(0);
  const [unitType, setUnitType] = useState<'DUZIA' | 'UNIDADE'>('DUZIA');

  const currentPrice = unitType === 'DUZIA' ? product.price : (product.unitPrice || product.price / 12);

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#1a1a1a]/5 hover:shadow-md transition-shadow flex flex-col gap-4 group relative overflow-hidden">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div 
          className="w-20 h-20 sm:w-24 sm:h-24 bg-[#f5f5f0] rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer group/img relative"
          onClick={() => onViewImage(product)}
        >
          {product.imageUrl ? (
            <>
              <img 
                src={getImageUrl(product.imageUrl)} 
                alt={product.description}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-full bg-[#e6e6e1] flex-col items-center justify-center text-[#5A5A40]/30">
                <Package size={24} />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
                <Eye size={16} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-[#e6e6e1] flex items-center justify-center text-[#5A5A40]/30">
              <Package size={24} />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between py-0.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold bg-[#f5f5f0] px-1.5 py-0.5 rounded uppercase opacity-60">Ref: {product.ref}</span>
            </div>
            <h3 className="font-medium leading-tight text-xs sm:text-sm line-clamp-2">{product.description}</h3>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-sm sm:text-base font-serif font-bold">R$ {currentPrice.toFixed(2)}</p>
            <p className="text-[9px] opacity-40 uppercase font-sans">/ {unitType === 'DUZIA' ? 'dz' : 'un'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 mt-auto">
        {product.unitPrice && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-40">Venda por</p>
            <div className="flex gap-2">
              <button
                onClick={() => setUnitType('DUZIA')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  unitType === 'DUZIA' 
                    ? 'bg-[#5A5A40] text-white shadow-sm' 
                    : 'bg-[#f5f5f0] text-[#1a1a1a] hover:bg-[#e6e6e1]'
                }`}
              >
                DÚZIA
              </button>
              <button
                onClick={() => setUnitType('UNIDADE')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  unitType === 'UNIDADE' 
                    ? 'bg-[#5A5A40] text-white shadow-sm' 
                    : 'bg-[#f5f5f0] text-[#1a1a1a] hover:bg-[#e6e6e1]'
                }`}
              >
                UNIDADE
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider font-bold opacity-40">Tamanho</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedSize === size 
                    ? 'bg-[#5A5A40] text-white shadow-md' 
                    : 'bg-[#f5f5f0] text-[#1a1a1a] hover:bg-[#e6e6e1]'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#f5f5f0] rounded-full p-1 flex-1">
            <button 
              onClick={() => setQuantity(q => Math.max(0, q - 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-full transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="flex-1 text-center font-bold">{quantity} {unitType === 'DUZIA' ? 'dz' : 'un'}</span>
            <button 
              onClick={() => setQuantity(q => q + 1)}
              className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-full transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={() => {
              onAdd(product, selectedSize, quantity, unitType);
              setQuantity(0);
            }}
            disabled={quantity === 0}
            className="bg-[#5A5A40] text-white p-3 rounded-full hover:bg-[#4a4a34] transition-all shadow-lg shadow-[#5A5A40]/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
