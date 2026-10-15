'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore, TipoPedido } from '@/stores/useCartStore';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  ModalPersonalizacao,
  ProdutoCardapio,
  AdicionalDisponivel,
} from '@/components/pdv/ModalPersonalizacao';
import { ModalCheckout } from '@/components/pdv/ModalCheckout';

export default function PdvHome() {
  const router = useRouter();
  const { usuario, logout, autenticado } = useAuthStore();

  const {
    tipoPedido,
    setTipoPedido,
    itens,
    removerItem,
    atualizarQuantidade,
    calcularTotal,
  } = useCartStore();

  const [produtos, setProdutos] = useState<ProdutoCardapio[]>([]);
  const [adicionais, setAdicionais] = useState<AdicionalDisponivel[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<'TRADICIONAIS' | 'PRENSADOS'>('TRADICIONAIS');
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoCardapio | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [toastSucesso, setToastSucesso] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Redireciona para o login caso nÃ£o esteja autenticado
  useEffect(() => {
    if (!autenticado) {
      router.push('/login');
    }
  }, [autenticado, router]);

  useEffect(() => {
    async function carregarCardapio() {
      try {
        const res = await fetch('http://localhost:4000/api/public/cardapio');
        const data = await res.json();
        if (data.sucesso) {
          setProdutos(data.cardapio);
          setAdicionais(data.adicionais_disponiveis);
        }
      } catch (err) {
        console.error('Falha ao carregar cardÃ¡pio da Dog House:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregarCardapio();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (itens.length > 0) {
          setCheckoutAberto(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itens]);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => p.categoria === categoriaAtiva);
  }, [produtos, categoriaAtiva]);

  const abrirModalItem = (produto: ProdutoCardapio) => {
    setProdutoSelecionado(produto);
    setModalAberto(true);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const total = calcularTotal();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      
      {/* PAINEL ESQUERDO: CatÃ¡logo */}
      <div className="flex-1 flex flex-col h-full border-r border-zinc-800">
        
        {/* Barra Superior */}
        <header className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">ðŸŒ­</span>
            <div>
              <h1 className="text-base font-black tracking-tight">DOG HOUSE â€¢ PDV</h1>
              <p className="text-[11px] text-zinc-400">Frente de Caixa Operacional</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Perfil do UsuÃ¡rio */}
            {usuario && (
              <div className="flex items-center gap-2 bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700/60 text-xs">
                <span className="text-sm">ðŸ‘¤</span>
                <span className="font-bold text-zinc-200">{usuario.nome}</span>
                <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                  {usuario.cargo}
                </span>
              </div>
            )}

                        {usuario?.cargo === 'ADMIN' && (
              <Link
                href="/admin/financeiro"
                className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold text-xs flex items-center gap-1.5 border border-zinc-700 transition"
              >
                <span>📊</span>
                <span>Financeiro</span>
              </Link>
            )}
            <Link
              href="/kanban"
              className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-zinc-700 transition"
            >
              <span>ðŸ”¥</span>
              <span>Cozinha Kanban</span>
            </Link>

            {/* Triagem de Pedido */}
            <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
              {(['PRESENCIAL', 'RETIRADA', 'ENTREGA'] as TipoPedido[]).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoPedido(tipo)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    tipoPedido === tipo
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {tipo === 'PRESENCIAL' && 'ðŸ½ï¸ BalcÃ£o'}
                  {tipo === 'RETIRADA' && 'ðŸ›ï¸ Retirada'}
                  {tipo === 'ENTREGA' && 'ðŸ›µ Entrega'}
                </button>
              ))}
            </div>

            {/* BotÃ£o Sair */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition text-xs font-bold"
              title="Encerrar SessÃ£o"
            >
              ðŸšª Sair
            </button>
          </div>
        </header>

        {/* Abas */}
        <div className="px-6 pt-3 flex gap-4 bg-zinc-900/60 border-b border-zinc-800">
          <button
            type="button"
            onClick={() => setCategoriaAtiva('TRADICIONAIS')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all ${
              categoriaAtiva === 'TRADICIONAIS'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Hot Dogs Tradicionais
          </button>
          <button
            type="button"
            onClick={() => setCategoriaAtiva('PRENSADOS')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all ${
              categoriaAtiva === 'PRENSADOS'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Hot Dogs Prensados
          </button>
        </div>

        {/* Grid de Produtos */}
        <div className="flex-1 overflow-y-auto p-6">
          {carregando ? (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              Carregando cardÃ¡pio...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {produtosFiltrados.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => abrirModalItem(prod)}
                  className="group flex flex-col justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/60 hover:shadow-xl transition cursor-pointer"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition">
                        {prod.nome}
                      </h3>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-900">
                        R$ {prod.preco.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                      {prod.descricao}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
                    <span>{prod.ingredientes_padrao.length} ingredientes</span>
                    <span className="font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                      Personalizar +
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PAINEL DIREITO: Comanda */}
      <div className="w-96 flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-100">
              Comanda Atual
            </h2>
            <span className="text-xs text-zinc-400">
              Tipo: <strong className="text-emerald-400">{tipoPedido}</strong>
            </span>
          </div>
          <span className="text-xs bg-zinc-800 px-2.5 py-1 rounded-full font-bold text-zinc-300">
            {itens.length} {itens.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 p-6">
              <span className="text-4xl mb-2">ðŸ›’</span>
              <p className="text-xs font-semibold">Carrinho vazio</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                Clique em um lanche do cardÃ¡pio para adicionar
              </p>
            </div>
          ) : (
            itens.map((item) => (
              <div
                key={item.id_temporario}
                className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-xs space-y-1.5"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-zinc-100">
                    {item.quantidade}x {item.nome}
                  </span>
                  <span className="font-bold text-zinc-100">
                    R$ {item.subtotal.toFixed(2)}
                  </span>
                </div>

                {item.modo === 'RETIRAR' && item.itens_removidos.length > 0 && (
                  <p className="text-[11px] text-red-400 font-medium">
                    SEM: {item.itens_removidos.map((r) => r.nome).join(', ')}
                  </p>
                )}

                {item.modo === 'SOMENTE' && item.itens_inclusos.length > 0 && (
                  <p className="text-[11px] text-emerald-400 font-medium">
                    SOMENTE: {item.itens_inclusos.map((i) => i.nome).join(', ')}
                  </p>
                )}

                {item.adicionais.length > 0 && (
                  <p className="text-[11px] text-amber-300 font-medium">
                    + {item.adicionais.map((a) => `${a.quantidade}x ${a.nome}`).join(', ')}
                  </p>
                )}

                {item.observacao && (
                  <p className="text-[11px] text-zinc-400 italic">
                    Obs: &quot;{item.observacao}&quot;
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-zinc-700/70">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => atualizarQuantidade(item.id_temporario, item.quantidade - 1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 font-bold"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold">{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => atualizarQuantidade(item.id_temporario, item.quantidade + 1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 font-bold"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removerItem(item.id_temporario)}
                    className="text-red-400 hover:text-red-300 text-[11px] font-semibold"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Subtotal Pedido</span>
            <span className="text-xl font-black text-emerald-400">
              R$ {total.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            disabled={itens.length === 0}
            onClick={() => setCheckoutAberto(true)}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            <span>AvanÃ§ar para Pagamento</span>
            <kbd className="text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded font-mono">
              F2
            </kbd>
          </button>
        </div>
      </div>

      <ModalPersonalizacao
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        produto={produtoSelecionado}
        adicionaisDisponiveis={adicionais}
      />

      <ModalCheckout
        isOpen={checkoutAberto}
        onClose={() => setCheckoutAberto(false)}
        onSucesso={() => {
          setToastSucesso(true);
          setTimeout(() => setToastSucesso(false), 4000);
        }}
      />

      {toastSucesso && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-bold shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom">
          <span className="text-2xl">ðŸ”¥</span>
          <div>
            <p className="text-sm font-black">Pedido Enviado com Sucesso!</p>
            <p className="text-xs text-emerald-100">Comanda recebida em tempo real na Cozinha Kanban.</p>
          </div>
        </div>
      )}
    </div>
  );
}