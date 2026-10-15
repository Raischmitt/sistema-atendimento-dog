'use client';

import React, { useState, useEffect } from 'react';
import { useCartStore, ModoPersonalizacao, AdicionalItem, IngredienteItem } from '@/stores/useCartStore';

export interface ProdutoCardapio {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  preco: number;
  ingredientes_padrao: {
    ingrediente_id: string;
    nome: string;
    quantidade_padrao: number;
    unidade_medida: string;
  }[];
}

export interface AdicionalDisponivel {
  id: string;
  nome: string;
  preco: number;
}

interface ModalPersonalizacaoProps {
  produto: ProdutoCardapio | null;
  adicionaisDisponiveis: AdicionalDisponivel[];
  isOpen: boolean;
  onClose: () => void;
}

export const ModalPersonalizacao: React.FC<ModalPersonalizacaoProps> = ({
  produto,
  adicionaisDisponiveis,
  isOpen,
  onClose,
}) => {
  const adicionarAoCarrinho = useCartStore((state) => state.adicionarItem);

  const [modo, setModo] = useState<ModoPersonalizacao>('RETIRAR');
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [quantidadesAdicionais, setQuantidadesAdicionais] = useState<Record<string, number>>({});
  const [observacao, setObservacao] = useState('');
  const [quantidadeLanche, setQuantidadeLanche] = useState(1);
  const [erroValidacao, setErroValidacao] = useState('');

  useEffect(() => {
    if (produto && isOpen) {
      setModo('RETIRAR');
      const inicial: Record<string, boolean> = {};
      produto.ingredientes_padrao.forEach((ing) => {
        inicial[ing.ingrediente_id] = true;
      });
      setSelecionados(inicial);
      setQuantidadesAdicionais({});
      setObservacao('');
      setQuantidadeLanche(1);
      setErroValidacao('');
    }
  }, [produto, isOpen]);

  const alternarModo = (novoModo: ModoPersonalizacao) => {
    setModo(novoModo);
    setErroValidacao('');
    if (!produto) return;

    const novoEstado: Record<string, boolean> = {};
    produto.ingredientes_padrao.forEach((ing) => {
      novoEstado[ing.ingrediente_id] = novoModo === 'RETIRAR';
    });
    setSelecionados(novoEstado);
  };

  const toggleIngrediente = (ingredienteId: string) => {
    setSelecionados((prev) => ({
      ...prev,
      [ingredienteId]: !prev[ingredienteId],
    }));
    setErroValidacao('');
  };

  const alterarAdicional = (adicionalId: string, delta: number) => {
    setQuantidadesAdicionais((prev) => {
      const atual = prev[adicionalId] || 0;
      const novo = Math.max(0, atual + delta);
      return { ...prev, [adicionalId]: novo };
    });
  };

  if (!isOpen || !produto) return null;

  const totalAdicionaisUnitario = adicionaisDisponiveis.reduce((acc, adic) => {
    const qtd = quantidadesAdicionais[adic.id] || 0;
    return acc + adic.preco * qtd;
  }, 0);
  const precoFinalUnitario = produto.preco + totalAdicionaisUnitario;
  const precoTotal = precoFinalUnitario * quantidadeLanche;

  const handleSalvar = () => {
    const ingredientesMarcados = produto.ingredientes_padrao.filter(
      (ing) => selecionados[ing.ingrediente_id]
    );

    if (modo === 'SOMENTE' && ingredientesMarcados.length === 0) {
      setErroValidacao('No modo "Somente", selecione ao menos 1 ingrediente!');
      return;
    }

    const itensRemovidos: IngredienteItem[] = [];
    const itensInclusos: IngredienteItem[] = [];

    if (modo === 'RETIRAR') {
      produto.ingredientes_padrao.forEach((ing) => {
        if (!selecionados[ing.ingrediente_id]) {
          itensRemovidos.push({ ingrediente_id: ing.ingrediente_id, nome: ing.nome });
        }
      });
    } else {
      ingredientesMarcados.forEach((ing) => {
        itensInclusos.push({ ingrediente_id: ing.ingrediente_id, nome: ing.nome });
      });
    }

    const adicionaisParaSalvar: AdicionalItem[] = [];
    adicionaisDisponiveis.forEach((adic) => {
      const qtd = quantidadesAdicionais[adic.id] || 0;
      if (qtd > 0) {
        adicionaisParaSalvar.push({
          adicional_id: adic.id,
          nome: adic.nome,
          preco_unitario: adic.preco,
          quantidade: qtd,
        });
      }
    });

    adicionarAoCarrinho({
      produto_id: produto.id,
      nome: produto.nome,
      categoria: produto.categoria,
      preco_base: produto.preco,
      quantidade: quantidadeLanche,
      modo,
      itens_removidos: itensRemovidos,
      itens_inclusos: itensInclusos,
      adicionais: adicionaisParaSalvar,
      observacao,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              🌭 {produto.nome}
            </h2>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              R$ {produto.preco.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Modo de Preparo
            </label>
            <div className="grid grid-cols-2 p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => alternarModo('RETIRAR')}
                className={`py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  modo === 'RETIRAR'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                ✓ Modo Retirar (Desmarque o que sai)
              </button>
              <button
                type="button"
                onClick={() => alternarModo('SOMENTE')}
                className={`py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  modo === 'SOMENTE'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                ★ Modo Somente (Marque apenas o que vai)
              </button>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border transition-colors ${
              modo === 'RETIRAR'
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {modo === 'RETIRAR' ? 'Ingredientes do Lanche' : 'Selecione os Ingredientes'}
              </span>
              <span className="text-xs text-zinc-500">
                {modo === 'RETIRAR' ? 'Desmarque para retirar' : 'Apenas os marcados entrarão'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {produto.ingredientes_padrao.map((ing) => {
                const isChecked = !!selecionados[ing.ingrediente_id];
                return (
                  <button
                    key={ing.ingrediente_id}
                    type="button"
                    onClick={() => toggleIngrediente(ing.ingrediente_id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                      isChecked
                        ? modo === 'RETIRAR'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700 line-through'
                    }`}
                  >
                    <span className="text-sm">{isChecked ? '✓' : '✗'}</span>
                    <span className="truncate">{ing.nome}</span>
                  </button>
                );
              })}
            </div>

            {erroValidacao && (
              <p className="mt-3 text-xs font-bold text-red-500 dark:text-red-400">
                ⚠️ {erroValidacao}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 block">
              Adicionais Dinâmicos
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {adicionaisDisponiveis.map((adic) => {
                const qtd = quantidadesAdicionais[adic.id] || 0;
                return (
                  <div
                    key={adic.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700"
                  >
                    <div>
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {adic.nome}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        + R$ {adic.preco.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => alterarAdicional(adic.id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {qtd}
                      </span>
                      <button
                        type="button"
                        onClick={() => alterarAdicional(adic.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
              Observações Especiais
            </label>
            <textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Caprichar no molho da panela, cortar ao meio..."
              className="w-full text-xs p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-zinc-500">Qtd:</span>
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setQuantidadeLanche(Math.max(1, quantidadeLanche - 1))}
                className="w-8 h-8 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 font-bold"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-bold text-zinc-800 dark:text-zinc-100">
                {quantidadeLanche}
              </span>
              <button
                type="button"
                onClick={() => setQuantidadeLanche(quantidadeLanche + 1)}
                className="w-8 h-8 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] text-zinc-500">Subtotal</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                R$ {precoTotal.toFixed(2)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSalvar}
              className="py-2.5 px-6 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition transform active:scale-95"
            >
              Adicionar ao Pedido
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};