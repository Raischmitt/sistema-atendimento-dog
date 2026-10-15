'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useCartStore, TipoPedido } from '@/stores/useCartStore';

export const TAXAS_PALHOCA: { bairro: string; taxa: number }[] = [
  { bairro: 'Aririu', taxa: 4.0 },
  { bairro: 'Pachecos', taxa: 5.0 },
  { bairro: 'Guarda', taxa: 5.0 },
  { bairro: 'Alto Aririu', taxa: 5.0 },
  { bairro: 'Nova Palhoça', taxa: 6.0 },
  { bairro: 'Rio Grande', taxa: 6.0 },
  { bairro: 'Bela Vista', taxa: 6.0 },
  { bairro: 'Barra', taxa: 7.0 },
  { bairro: 'Centro', taxa: 7.0 },
  { bairro: 'Caminho Novo', taxa: 7.0 },
  { bairro: 'Pagani', taxa: 7.0 },
  { bairro: 'Passa Vinte', taxa: 7.0 },
  { bairro: 'São Sebastião', taxa: 8.0 },
  { bairro: 'Jardim Eldorado', taxa: 8.0 },
  { bairro: 'Ponte do Imaruim', taxa: 8.0 },
  { bairro: 'Formiga', taxa: 8.0 },
  { bairro: 'Pontal', taxa: 8.0 },
];

export type MetodoPagamento = 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'VALE_REFEICAO';

export interface PagamentoSplitItem {
  id: string;
  metodo: MetodoPagamento;
  valor: number;
}

interface ModalCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSucesso: () => void;
}

export const ModalCheckout: React.FC<ModalCheckoutProps> = ({
  isOpen,
  onClose,
  onSucesso,
}) => {
  const { tipoPedido, setTipoPedido, itens, calcularTotal, limparCarrinho } = useCartStore();

  const subtotalProdutos = calcularTotal();

  const [telefone, setTelefone] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairroSelecionado, setBairroSelecionado] = useState('');
  const [referencia, setReferencia] = useState('');

  const [pagamentos, setPagamentos] = useState<PagamentoSplitItem[]>([
    { id: '1', metodo: 'PIX', valor: 0 },
  ]);
  const [trocoPara, setTrocoPara] = useState<number | ''>('');
  const [enviando, setEnviando] = useState(false);
  const [erroValidacao, setErroValidacao] = useState('');

  const taxaEntrega = useMemo(() => {
    if (tipoPedido !== 'ENTREGA') return 0;
    const encontrado = TAXAS_PALHOCA.find((t) => t.bairro === bairroSelecionado);
    return encontrado ? encontrado.taxa : 0;
  }, [tipoPedido, bairroSelecionado]);

  const valorTotalPedido = subtotalProdutos + taxaEntrega;

  useEffect(() => {
    if (isOpen) {
      setPagamentos([{ id: crypto.randomUUID(), metodo: 'PIX', valor: valorTotalPedido }]);
      setTrocoPara('');
      setErroValidacao('');
    }
  }, [isOpen, valorTotalPedido]);

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    setTelefone(rawVal);

    if (rawVal.length >= 10) {
      setBuscandoCliente(true);
      setTimeout(() => {
        if (rawVal === '48999998888') {
          setNomeCliente('Carlos Eduardo (Cliente Frequente)');
          setLogradouro('Rua José Bonifácio');
          setNumero('245');
          setBairroSelecionado('Pagani');
          setReferencia('Próximo à Prefeitura');
        } else if (!nomeCliente) {
          setNomeCliente('Cliente Novo');
        }
        setBuscandoCliente(false);
      }, 350);
    }
  };

  const totalPagoAtual = pagamentos.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  const diferencaPagamento = Number((valorTotalPedido - totalPagoAtual).toFixed(2));

  const adicionarMetodoPagamento = () => {
    const valorRestante = Math.max(0, diferencaPagamento);
    setPagamentos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), metodo: 'DINHEIRO', valor: valorRestante },
    ]);
  };

  const removerMetodoPagamento = (id: string) => {
    if (pagamentos.length === 1) return;
    setPagamentos((prev) => prev.filter((p) => p.id !== id));
  };

  const atualizarMetodo = (id: string, metodo: MetodoPagamento) => {
    setPagamentos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, metodo } : p))
    );
  };

  const atualizarValorMetodo = (id: string, valorStr: string) => {
    const valorNum = parseFloat(valorStr) || 0;
    setPagamentos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, valor: valorNum } : p))
    );
  };

  const pagamentoEmDinheiro = pagamentos.find((p) => p.metodo === 'DINHEIRO');
  const valorEmDinheiro = pagamentoEmDinheiro ? Number(pagamentoEmDinheiro.valor) : 0;

  const trocoCalculado = useMemo(() => {
    if (!valorEmDinheiro || trocoPara === '' || Number(trocoPara) <= valorEmDinheiro) {
      return 0;
    }
    return Number(trocoPara) - valorEmDinheiro;
  }, [valorEmDinheiro, trocoPara]);

  const handleFinalizar = async () => {
    setErroValidacao('');

    if (tipoPedido === 'ENTREGA') {
      if (!logradouro.trim() || !numero.trim()) {
        setErroValidacao('Rua e número são obrigatórios para entregas.');
        return;
      }
      if (!bairroSelecionado) {
        setErroValidacao('Selecione um bairro atendido de Palhoça.');
        return;
      }
    }

    if (Math.abs(diferencaPagamento) > 0.01) {
      setErroValidacao(
        `A soma dos pagamentos (R$ ${totalPagoAtual.toFixed(2)}) deve ser exatamente igual ao total (R$ ${valorTotalPedido.toFixed(2)}).`
      );
      return;
    }

    if (tipoPedido === 'ENTREGA' && valorEmDinheiro > 0) {
      if (trocoPara === '' || Number(trocoPara) < valorEmDinheiro) {
        setErroValidacao('Em pedidos de entrega com dinheiro, informe o campo "Troco para quanto?".');
        return;
      }
    }

    setEnviando(true);

    try {
      const payload = {
        tipo_pedido: tipoPedido,
        cliente: {
          telefone,
          nome: nomeCliente || 'Cliente Balcão',
        },
        logistica: tipoPedido === 'ENTREGA' ? {
          logradouro,
          numero,
          complemento,
          bairro: bairroSelecionado,
          referencia,
          taxa_entrega: taxaEntrega,
        } : null,
        financeiro: {
          subtotal: subtotalProdutos,
          taxa_entrega: taxaEntrega,
          total: valorTotalPedido,
          troco_para: trocoPara !== '' ? Number(trocoPara) : null,
          troco_a_levar: trocoCalculado,
          pagamentos: pagamentos.map((p) => ({
            metodo: p.metodo,
            valor: p.valor,
          })),
        },
        itens: itens.map((item) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          modo: item.modo,
          subtotal: item.subtotal,
          itens_removidos: item.itens_removidos.map((r) => r.ingrediente_id),
          itens_inclusos: item.itens_inclusos.map((i) => i.ingrediente_id),
          adicionais: item.adicionais,
          observacao: item.observacao,
        })),
      };

      await fetch('http://localhost:4000/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      limparCarrinho();
      onSucesso();
      onClose();
    } catch (err) {
      console.error(err);
      setErroValidacao('Ocorreu um erro ao registrar o pedido no servidor.');
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[95vh] flex flex-col rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              💳 Fechamento de Pedido
            </h2>
            <p className="text-xs text-zinc-500">
              {itens.length} itens no pedido • Subtotal: R$ {subtotalProdutos.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 block">
                Tipo de Atendimento
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['PRESENCIAL', 'RETIRADA', 'ENTREGA'] as TipoPedido[]).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoPedido(tipo)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
                      tipoPedido === tipo
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    {tipo === 'PRESENCIAL' && '🍽️ Balcão'}
                    {tipo === 'RETIRADA' && '🛍️ Retirada'}
                    {tipo === 'ENTREGA' && '🛵 Entrega'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                Identificação do Cliente (CRM)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500">Telefone (com DDD)</label>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    placeholder="48999998888"
                    className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {buscandoCliente && (
                    <span className="text-[10px] text-emerald-500 mt-1 block">Buscando cadastro...</span>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-500">Nome do Cliente</label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Nome completo ou apelido"
                    className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {tipoPedido === 'ENTREGA' && (
              <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-3 animate-in fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    🛵 Entrega em Palhoça
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    Taxa: R$ {taxaEntrega.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                    Bairro de Palhoça (Obrigatório)
                  </label>
                  <select
                    value={bairroSelecionado}
                    onChange={(e) => setBairroSelecionado(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Selecione o Bairro...</option>
                    {TAXAS_PALHOCA.map((b) => (
                      <option key={b.bairro} value={b.bairro}>
                        {b.bairro} — R$ {b.taxa.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Logradouro (Rua/Av)</label>
                    <input
                      type="text"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      placeholder="Ex: Rua Barão do Rio Branco"
                      className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Número</label>
                    <input
                      type="text"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="Ex: 120"
                      className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Complemento</label>
                    <input
                      type="text"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      placeholder="Apto, Bloco..."
                      className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Ponto de Referência</label>
                    <input
                      type="text"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      placeholder="Próximo ao mercado..."
                      className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Subtotal dos Produtos:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  R$ {subtotalProdutos.toFixed(2)}
                </span>
              </div>

              {tipoPedido === 'ENTREGA' && (
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Taxa de Entrega ({bairroSelecionado || 'A definir'}):</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    + R$ {taxaEntrega.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Valor Total do Pedido:
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  R$ {valorTotalPedido.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Formas de Pagamento (Split)
                </label>
                <button
                  type="button"
                  onClick={adicionarMetodoPagamento}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  + Adicionar Pagamento
                </button>
              </div>

              <div className="space-y-2.5">
                {pagamentos.map((p, index) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  >
                    <span className="text-xs font-bold text-zinc-400 w-4">#{index + 1}</span>

                    <select
                      value={p.metodo}
                      onChange={(e) => atualizarMetodo(p.id, e.target.value as MetodoPagamento)}
                      className="text-xs p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="PIX">⚡ Pix</option>
                      <option value="DINHEIRO">💵 Dinheiro</option>
                      <option value="CARTAO_CREDITO">💳 Cartão Crédito</option>
                      <option value="CARTAO_DEBITO">💳 Cartão Débito</option>
                      <option value="VALE_REFEICAO">🍽️ VR / Vale</option>
                    </select>

                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-2 text-xs font-semibold text-zinc-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={p.valor || ''}
                        onChange={(e) => atualizarValorMetodo(p.id, e.target.value)}
                        placeholder="0.00"
                        className="w-full text-xs pl-8 pr-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    {pagamentos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerMetodoPagamento(p.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs p-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-800/40">
                <span>Total Declarado: <strong>R$ {totalPagoAtual.toFixed(2)}</strong></span>
                {diferencaPagamento === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    ✓ Valor 100% Coberto
                  </span>
                ) : diferencaPagamento > 0 ? (
                  <span className="text-amber-500 font-bold">
                    Faltam R$ {diferencaPagamento.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-red-500 font-bold">
                    Excedeu R$ {Math.abs(diferencaPagamento).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {valorEmDinheiro > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-3 animate-in fade-in">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
                  💵 Gestão de Troco (Parcela em Dinheiro: R$ {valorEmDinheiro.toFixed(2)})
                </span>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Troco para quanto? {tipoPedido === 'ENTREGA' && <strong className="text-red-500">*</strong>}
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={trocoPara}
                      onChange={(e) => setTrocoPara(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Ex: 50.00"
                      className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center">
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Troco a Levar</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      R$ {trocoCalculado.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {erroValidacao && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold">
                ⚠️ {erroValidacao}
              </div>
            )}
          </div>
        </div>

        <div className="px-8 py-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-6 rounded-xl font-bold text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
          >
            Voltar ao Carrinho
          </button>

          <button
            type="button"
            disabled={enviando || diferencaPagamento !== 0}
            onClick={handleFinalizar}
            className="py-3.5 px-8 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-white shadow-xl shadow-emerald-600/30 transition transform active:scale-95 flex items-center gap-2"
          >
            {enviando ? <span>Gravando no Banco...</span> : <span>Confirmar & Mandar pra Cozinha 🔥</span>}
          </button>
        </div>

      </div>
    </div>
  );
};
