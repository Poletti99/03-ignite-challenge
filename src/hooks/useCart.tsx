import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const stock = await api.get<Stock>(`/stock/${productId}`);
      const productInCart = newCart.find(product => product.id === productId);

      if (productInCart) {
        if (stock.data.amount < productInCart.amount + 1) {
          throw new Error('Quantidade solicitada fora de estoque');
        }

        productInCart.amount += 1;
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        return;
      }

      if (stock.data.amount < 1) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      const product = await api.get<Product>(`/products/${productId}`);

      setCart([...newCart, { ...product.data, amount: 1 }]);
      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify([...newCart, { ...product.data, amount: 1 }]),
      );
    } catch (error) {
      let message = error.message;
      if (error?.response?.status === 404) {
        message = 'Erro na adição do produto';
      }

      toast.error(message || 'Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];
      const productIndex = newCart.findIndex(
        product => product.id === productId,
      );

      if (productIndex === -1) {
        throw new Error('Erro na remoção do produto');
      }

      newCart.splice(productIndex, 1);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (error) {
      toast.error(error.message || 'Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return;
      }

      const newCart = [...cart];
      const productInCart = newCart.find(product => product.id === productId);
      if (!productInCart) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const stock = await api.get<Stock>(`/stock/${productId}`);

      if (productInCart) {
        if (stock.data.amount < amount) {
          throw new Error('Quantidade solicitada fora de estoque');
        }

        productInCart.amount = amount;
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        return;
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao atualizar quantidade.');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
