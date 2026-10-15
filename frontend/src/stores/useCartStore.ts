import { create } from 'zustand';

export type TipoPedido = 'PRESENCIAL' | 'RETIRADA' | 'ENTREGA';
export type ModoPersonalizacao = 'RETIRAR' | 'SOMENTE';

export interface IngredienteItem {
  ingrediente_id: string;
  nome: string;
}

export interface AdicionalItem {
  adicional_id: string;
  nome: string;
  preco_unitario: number;
  quantidade: number;
}

export interface CartItem {
  id_temporario: string;
  produto_id: string;
  nome: string;
  categoria: string;
  preco_base: number;
  quantidade: number;
  modo: ModoPersonalizacao;
  itens_removidos: IngredienteItem[];
  itens_inclusos: IngredienteItem[];
  adicionais: AdicionalItem[];
  observacao: string;
  subtotal: number;
}

interface CartStore {
  tipoPedido: TipoPedido;
  itens: CartItem[];
  setTipoPedido: (tipo: TipoPedido) => void;
  adicionarItem: (item: Omit<CartItem, 'id_temporario' | 'subtotal'>) => void;
  removerItem: (idTemporario: string) => void;
  atualizarQuantidade: (idTemporario: string, novaQuantidade: number) => void;
  limparCarrinho: () => void;
  calcularTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  tipoPedido: 'PRESENCIAL',
  itens: [],

  setTipoPedido: (tipo) => set({ tipoPedido: tipo }),

  adicionarItem: (item) => {
    const totalAdicionais = item.adicionais.reduce(
      (acc, a) => acc + a.preco_unitario * a.quantidade,
      0
    );
    const precoUnitarioCalculado = item.preco_base + totalAdicionais;
    const subtotal = precoUnitarioCalculado * item.quantidade;

    const novoItem: CartItem = {
      ...item,
      id_temporario: crypto.randomUUID(),
      subtotal,
    };

    set((state) => ({ itens: [...state.itens, novoItem] }));
  },

  removerItem: (idTemporario) => {
    set((state) => ({
      itens: state.itens.filter((i) => i.id_temporario !== idTemporario),
    }));
  },

  atualizarQuantidade: (idTemporario, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      get().removerItem(idTemporario);
      return;
    }

    set((state) => ({
      itens: state.itens.map((item) => {
        if (item.id_temporario === idTemporario) {
          const totalAdicionais = item.adicionais.reduce(
            (acc, a) => acc + a.preco_unitario * a.quantidade,
            0
          );
          const precoUnitario = item.preco_base + totalAdicionais;
          return {
            ...item,
            quantidade: novaQuantidade,
            subtotal: precoUnitario * novaQuantidade,
          };
        }
        return item;
      }),
    }));
  },

  limparCarrinho: () => set({ itens: [] }),

  calcularTotal: () => {
    return get().itens.reduce((acc, item) => acc + item.subtotal, 0);
  },
}));
