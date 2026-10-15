'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

interface ResumoCaixa {
  caixa: {
    id: string;
    status: string;
    aberto_por: string;
    data_abertura: string;
    fundo_abertura: number;
  } | null;
  totais: {
    total_pedidos: number;
    total_faturado: number;
    total_taxas_entrega: number;
    ticket_medio: number;
    fundo_abertura: number;
    total_dinheiro_bruto: number;
    total_troco_levado: number;
    saldo_projetado_gaveta: number;
    pedidos_pendentes: number;
  };
  split_pagamentos: {
    PIX: number;
    DINHEIRO: number;
    CARTAO_CREDITO: number;
    CARTAO_DEBITO: number;
    VALE_REFEICAO: number;
    OUTRO: number;
  };
}

interface EntregaItem {
  id: string;
  numero_diario: number;
  status: string;
  hora: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  bairro: string | null;
  endereco: string;
  motoboy: string;
  motoboy_placa: string | null;
  valor_total: number;
  taxa_entrega: number;
  valor_dinheiro: number;
  troco_levado: number;
  troco_para: number | null;
  valor_a_acertar: number;
  metodos_pagamento: string[];
}

interface AcertoMotoboysResponse {
  sucesso: boolean;
  resumo_geral: {
    total_entregas: number;
    total_dinheiro_cobrado: number;
    total_troco_levado: number;
    total_taxas_repassar: number;
    total_a_acertar: number;
  };
  entregas: EntregaItem[];
}

export default function FinanceiroAdminPage() {
  const router = useRouter();
  const { token, usuario, autenticado, isAdmin } = useAuthStore();

  const [resumo, setResumo] = useState<ResumoCaixa | null>(null);
  const [acerto, setAcerto] = useState<AcertoMotoboysResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarDados = useCallback(async () => {
    if (!token) return;
    setCarregando(true);
    setErro('');

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const [resCaixa, resMotoboy] = await Promise.all([
        fetch('http://localhost:4000/api/admin/financeiro/caixa/resumo', { headers }),
        fetch('http://localhost:4000/api/admin/financeiro/motoboys/acerto', { headers }),
      ]);

      if (resCaixa.status === 403 || resMotoboy.status === 403) {
        setErro('Acesso restrito: você não possui privilégios de Administrador.');
        setCarregando(false);
        return;
      }

      const dataCaixa = await resCaixa.json();
      const dataMotoboy = await resMotoboy.json();

      if (dataCaixa.sucesso) setResumo(dataCaixa);
      if (dataMotoboy.sucesso) setAcerto(dataMotoboy);
    } catch (err) {
      console.error(err);
      setErro('Falha ao se comunicar com a API do servidor.');
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    if (!autenticado) {
      router.push('/login');
      return;
    }

    if (!isAdmin()) {
      setErro('Acesso negado: Somente administradores têm permissão para visualizar o financeiro.');
      setCarregando(false);
      return;
    }

    carregarDados();
  }, [autenticado, isAdmin, router, carregarDados]);

  if (!autenticado || !isAdmin()) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100">
        <div className="max-w-md rounded-2xl border border-red-900/60 bg-red-950/40 p-6 text-center space-y-4">
          <span className="text-4xl">🛑</span>
          <h1 className="text-xl font-black text-red-400">Acesso Restrito ao Financeiro</h1>
          <p className="text-xs text-zinc-400">
            Seu usuário possui perfil <strong>PADRÃO</strong>. O fechamento financeiro e acerto de motoboys
            são reservados a administradores (RN05).
          </p>
          <Link
            href="/"
            className="inline-block py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition"
          >
            ← Voltar ao PDV
          </Link>
        </div>
      </div>
    );
  }

  const split = resumo?.split_pagamentos;
  const totais = resumo?.totais;
  const totalFaturado = totais?.total_faturado || 0;

  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-100 font-sans p-6 space-y-6">
      
      {/* Barra de Navegação / Topo */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-600/20 border border-amber-500/30 text-xl">
            📊
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              DOG HOUSE • GESTÃO FINANCEIRA
            </h1>
            <p className="text-xs text-zinc-400">
              Consolidação de Caixa Diário & Acerto de Entregadores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={carregarDados}
            disabled={carregando}
            className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 border border-zinc-700 transition"
          >
            <span>🔄</span>
            <span>{carregando ? 'Atualizando...' : 'Atualizar Dados'}</span>
          </button>

          <Link
            href="/"
            className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 border border-zinc-700 transition"
          >
            <span>🛒</span>
            <span>Ir ao PDV</span>
          </Link>

          <Link
            href="/kanban"
            className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-amber-400 flex items-center gap-1.5 border border-zinc-700 transition"
          >
            <span>🔥</span>
            <span>Cozinha Kanban</span>
          </Link>
        </div>
      </header>

      {/* Alerta de Travamento de Caixa (RN06) */}
      {totais && totais.pedidos_pendentes > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/40 flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-300">
                Atenção: Fechamento de Caixa Bloqueado (RN06)
              </p>
              <p className="text-xs text-amber-200/80">
                Existem <strong>{totais.pedidos_pendentes}</strong> pedidos pendentes na cozinha ou em rota.
                Todos os pedidos devem ser marcados como &quot;Concluídos&quot; antes de fechar a gaveta física.
              </p>
            </div>
          </div>
          <Link
            href="/kanban"
            className="shrink-0 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition"
          >
            Ver Kanban
          </Link>
        </div>
      )}

      {/* Cards de Métricas Principais (Topo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Faturamento Total */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1 shadow-lg">
          <div className="flex justify-between items-center text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <span>Faturamento Bruto</span>
            <span className="text-emerald-400">💰</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            R$ {totais ? totais.total_faturado.toFixed(2) : '0.00'}
          </p>
          <p className="text-[11px] text-zinc-500">
            {totais ? totais.total_pedidos : 0} pedidos faturados hoje
          </p>
        </div>

        {/* Saldo Físico Projetado na Gaveta */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1 shadow-lg">
          <div className="flex justify-between items-center text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <span>Saldo Físico na Gaveta</span>
            <span className="text-amber-400">💵</span>
          </div>
          <p className="text-2xl font-black text-white">
            R$ {totais ? totais.saldo_projetado_gaveta.toFixed(2) : '0.00'}
          </p>
          <p className="text-[11px] text-zinc-500">
            Fundo inicial (R$ {totais ? totais.fundo_abertura.toFixed(2) : '0.00'}) + Dinheiro - Trocos
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1 shadow-lg">
          <div className="flex justify-between items-center text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <span>Ticket Médio</span>
            <span className="text-blue-400">📈</span>
          </div>
          <p className="text-2xl font-black text-blue-400">
            R$ {totais ? totais.ticket_medio.toFixed(2) : '0.00'}
          </p>
          <p className="text-[11px] text-zinc-500">
            Média de consumo por comanda
          </p>
        </div>

        {/* Taxas de Entrega Totais */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1 shadow-lg">
          <div className="flex justify-between items-center text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <span>Fretes de Palhoça</span>
            <span className="text-purple-400">🛵</span>
          </div>
          <p className="text-2xl font-black text-purple-400">
            R$ {totais ? totais.total_taxas_entrega.toFixed(2) : '0.00'}
          </p>
          <p className="text-[11px] text-zinc-500">
            Total arrecadado em taxas de entrega
          </p>
        </div>

      </div>

      {/* Seção Central Dividida: Split Payments vs Acerto de Motoboys */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel Esquerdo: Split Payments Breakdown (1 Coluna) */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5 shadow-lg">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>💳</span>
              <span>Split Payments (Métodos)</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Distribuição por forma de recebimento
            </p>
          </div>

          <div className="space-y-4">
            {[
              { label: '⚡ PIX', valor: split?.PIX || 0, cor: 'bg-emerald-500', textoCor: 'text-emerald-400' },
              { label: '💵 Dinheiro', valor: split?.DINHEIRO || 0, cor: 'bg-amber-500', textoCor: 'text-amber-400' },
              { label: '💳 Cartão de Crédito', valor: split?.CARTAO_CREDITO || 0, cor: 'bg-blue-500', textoCor: 'text-blue-400' },
              { label: '💳 Cartão de Débito', valor: split?.CARTAO_DEBITO || 0, cor: 'bg-indigo-500', textoCor: 'text-indigo-400' },
              { label: '🍽️ Vale Refeição (VR)', valor: split?.VALE_REFEICAO || 0, cor: 'bg-purple-500', textoCor: 'text-purple-400' },
            ].map((metodo) => {
              const porcentagem = totalFaturado > 0 ? (metodo.valor / totalFaturado) * 100 : 0;

              return (
                <div key={metodo.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-300">{metodo.label}</span>
                    <span className={metodo.textoCor}>
                      R$ {metodo.valor.toFixed(2)}{' '}
                      <span className="text-zinc-500 text-[10px]">({porcentagem.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full ${metodo.cor} rounded-full transition-all duration-500`}
                      style={{ width: `${porcentagem}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Troco Levado e Dinheiro na Gaveta */}
          <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Dinheiro Bruto Cobrado:</span>
              <span className="font-bold text-zinc-200">
                R$ {totais ? totais.total_dinheiro_bruto.toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Total de Troco Levado (Rua):</span>
              <span className="font-bold text-red-400">
                - R$ {totais ? totais.total_troco_levado.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Painel Direito: Acerto de Motoboys (2 Colunas) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🛵</span>
                <span>Acerto de Entregadores (Delivery Palhoça)</span>
              </h2>
              <span className="text-xs bg-purple-950 text-purple-300 font-bold px-2.5 py-0.5 rounded-lg border border-purple-800">
                {acerto?.resumo_geral.total_entregas || 0} Entregas
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Prestação de contas das entregas em dinheiro, trocos levados e taxas devidas
            </p>
          </div>

          {/* Tabela de Entregas */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Comanda</th>
                  <th className="py-2.5 px-3">Bairro / Cliente</th>
                  <th className="py-2.5 px-3">Entregador</th>
                  <th className="py-2.5 px-3">Total Pedido</th>
                  <th className="py-2.5 px-3">Troco Levado</th>
                  <th className="py-2.5 px-3 text-right">Cobrado em Dinheiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {!acerto || acerto.entregas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Nenhuma entrega registrada hoje até o momento.
                    </td>
                  </tr>
                ) : (
                  acerto.entregas.map((ent) => (
                    <tr key={ent.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        #{ent.numero_diario.toString().padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-zinc-200">{ent.bairro || 'Palhoça'}</p>
                        <p className="text-[10px] text-zinc-500 truncate max-w-[150px]">{ent.cliente_nome}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 font-semibold text-zinc-300">
                          {ent.motoboy}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-zinc-300">
                        R$ {ent.valor_total.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        {ent.troco_levado > 0 ? (
                          <span className="font-bold text-amber-400">
                            R$ {ent.troco_levado.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                        {ent.valor_dinheiro > 0 ? (
                          `R$ ${ent.valor_dinheiro.toFixed(2)}`
                        ) : (
                          <span className="text-zinc-500 font-normal">Pix/Cartão</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Barra Consolidada de Acerto no Rodapé */}
          <div className="pt-4 border-t border-zinc-800 grid grid-cols-3 gap-4 bg-zinc-950/60 p-4 rounded-xl border">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Dinheiro na Rua</p>
              <p className="text-lg font-black text-white">
                R$ {acerto?.resumo_geral.total_dinheiro_cobrado.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Troco Fornecido</p>
              <p className="text-lg font-black text-amber-400">
                R$ {acerto?.resumo_geral.total_troco_levado.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-emerald-400 uppercase">Total a Acertar com Caixa</p>
              <p className="text-xl font-black text-emerald-400">
                R$ {acerto?.resumo_geral.total_a_acertar.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}