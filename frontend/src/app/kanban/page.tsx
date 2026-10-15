'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/useAuthStore';

export type StatusPedido = 'REALIZADO' | 'SENDO_FEITO' | 'PRONTO' | 'EM_ROTA' | 'CONCLUIDO';

export interface PedidoKanban {
  id: string;
  numero_diario: number;
  tipo_pedido: 'PRESENCIAL' | 'RETIRADA' | 'ENTREGA';
  status: StatusPedido;
  created_at: string;
  tempo_inicio_preparo?: string | null;
  observacoes_gerais?: string | null;
  entrega_bairro?: string | null;
  entrega_logradouro?: string | null;
  entrega_numero?: string | null;
  link_rota_maps?: string | null;
  valor_total: number;
  cliente?: {
    nome: string;
    telefone: string;
  } | null;
  itens: {
    id: string;
    quantidade: number;
    modo_personalizacao: 'RETIRAR' | 'SOMENTE';
    observacao_item?: string | null;
    produto: {
      nome: string;
    };
    itens_removidos: {
      ingrediente: {
        nome: string;
      };
    }[];
    itens_inclusos: {
      ingrediente: {
        nome: string;
      };
    }[];
    adicionais: {
      quantidade: number;
      adicional: {
        nome: string;
      };
    }[];
  }[];
}

const COLUNAS: { id: StatusPedido; titulo: string; icone: string; corBorda: string }[] = [
  { id: 'REALIZADO', titulo: 'Realizados', icone: '📥', corBorda: 'border-zinc-800' },
  { id: 'SENDO_FEITO', titulo: 'Sendo Feitos', icone: '🔥', corBorda: 'border-amber-600/40' },
  { id: 'PRONTO', titulo: 'Prontos / Retirada', icone: '✅', corBorda: 'border-emerald-600/40' },
  { id: 'EM_ROTA', titulo: 'Em Rota', icone: '🛵', corBorda: 'border-purple-600/40' },
  { id: 'CONCLUIDO', titulo: 'Concluídos', icone: '🏁', corBorda: 'border-blue-600/40' },
];

export default function KanbanPage() {
  const router = useRouter();
  const { usuario, logout, autenticado } = useAuthStore();

  const [pedidos, setPedidos] = useState<PedidoKanban[]>([]);
  const [agora, setAgora] = useState<number>(Date.now());
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!autenticado) {
      router.push('/login');
    }
  }, [autenticado, router]);

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('http://localhost:4000/api/pedidos')
      .then((res) => res.json())
      .then((data) => {
        if (data.sucesso && Array.isArray(data.pedidos)) {
          setPedidos(data.pedidos);
        }
      })
      .catch((err) => console.error('Erro ao buscar pedidos no Kanban:', err));

    const socket: Socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConectado(true);
      socket.emit('kanban:join');
    });

    socket.on('disconnect', () => {
      setConectado(false);
    });

    socket.on('novo_pedido', (novoPedido: PedidoKanban) => {
      setPedidos((prev) => {
        if (prev.some((p) => p.id === novoPedido.id)) return prev;
        return [novoPedido, ...prev];
      });

      try {
        const audio = new Audio('/sounds/bell.mp3');
        audio.play().catch(() => {});
      } catch (_) {}
    });

    socket.on('pedido_atualizado', (pedidoAtualizado: PedidoKanban) => {
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoAtualizado.id ? pedidoAtualizado : p))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const moverStatus = async (pedidoId: string, novoStatus: StatusPedido) => {
    setPedidos((prev) =>
      prev.map((p) => {
        if (p.id === pedidoId) {
          const agoraIso = new Date().toISOString();
          return {
            ...p,
            status: novoStatus,
            tempo_inicio_preparo:
              novoStatus === 'SENDO_FEITO' && !p.tempo_inicio_preparo
                ? agoraIso
                : p.tempo_inicio_preparo,
          };
        }
        return p;
      })
    );

    try {
      await fetch(`http://localhost:4000/api/pedidos/${pedidoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      });
    } catch (err) {
      console.error('Falha ao atualizar status via API:', err);
    }
  };

  const handleDragStart = (id: string) => setArrastandoId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (colunaId: StatusPedido) => {
    if (arrastandoId) {
      moverStatus(arrastandoId, colunaId);
      setArrastandoId(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans select-none">
      
      {/* Barra Superior */}
      <header className="px-6 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌭</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">
                DOG HOUSE • COZINHA KANBAN
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  conectado
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    conectado ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`}
                />
                {conectado ? 'Online (Tempo Real)' : 'Desconectado'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Painel operacional da chapa e controle de SLA
            </p>
          </div>
        </div>

        {/* Legenda de SLA e Usuário */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs font-semibold bg-zinc-950/60 px-3.5 py-1.5 rounded-xl border border-zinc-800">
            <span className="text-zinc-500 font-bold uppercase text-[10px]">SLA Preparo:</span>
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              &lt; 20m
            </div>
            <div className="flex items-center gap-1.5 text-amber-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              20-35m
            </div>
            <div className="flex items-center gap-1.5 text-red-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              &gt; 35m
            </div>
          </div>

          <Link
            href="/"
            className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-zinc-700 transition"
          >
            <span>🛒</span>
            <span>Voltar ao PDV</span>
          </Link>

          {usuario && (
            <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700 text-xs">
              <span className="font-bold text-zinc-200">{usuario.nome}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition text-xs font-bold"
            title="Sair"
          >
            🚪
          </button>
        </div>
      </header>

      {/* Grid de 5 Colunas */}
      <main className="flex-1 grid grid-cols-5 gap-3 p-3 overflow-hidden bg-zinc-950">
        {COLUNAS.map((coluna) => {
          const pedidosColuna = pedidos.filter((p) => p.status === coluna.id);

          return (
            <div
              key={coluna.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(coluna.id)}
              className="flex flex-col h-full rounded-2xl bg-zinc-900/50 border border-zinc-800/80 overflow-hidden shadow-inner"
            >
              <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{coluna.icone}</span>
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                    {coluna.titulo}
                  </span>
                </div>
                <span className="text-xs font-black bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-lg border border-zinc-700">
                  {pedidosColuna.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {pedidosColuna.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-zinc-600 text-xs border border-dashed border-zinc-800/70 rounded-xl m-1">
                    <span>Nenhum pedido aqui</span>
                  </div>
                ) : (
                  pedidosColuna.map((pedido) => (
                    <CardKanban
                      key={pedido.id}
                      pedido={pedido}
                      agora={agora}
                      onDragStart={() => handleDragStart(pedido.id)}
                      onMoverStatus={moverStatus}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </main>

    </div>
  );
}

interface CardKanbanProps {
  pedido: PedidoKanban;
  agora: number;
  onDragStart: () => void;
  onMoverStatus: (id: string, novoStatus: StatusPedido) => void;
}

const CardKanban: React.FC<CardKanbanProps> = ({
  pedido,
  agora,
  onDragStart,
  onMoverStatus,
}) => {
  const baseTime = pedido.tempo_inicio_preparo
    ? new Date(pedido.tempo_inicio_preparo).getTime()
    : new Date(pedido.created_at).getTime();

  const diferencaSegundos = Math.max(0, Math.floor((agora - baseTime) / 1000));
  const minutos = Math.floor(diferencaSegundos / 60);
  const segundos = diferencaSegundos % 60;

  const estiloSla = useMemo(() => {
    if (pedido.status !== 'SENDO_FEITO') {
      return {
        cardClass: 'border-zinc-800/90 bg-zinc-900/95 hover:border-zinc-700',
        badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      };
    }

    if (minutos < 20) {
      return {
        cardClass: 'border-emerald-600/70 bg-zinc-900 shadow-emerald-950/20 shadow-lg',
        badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-700',
      };
    }

    if (minutos <= 35) {
      return {
        cardClass: 'border-amber-500/80 bg-zinc-900 shadow-amber-950/30 shadow-lg',
        badgeClass: 'bg-amber-950 text-amber-300 border-amber-600',
      };
    }

    return {
      cardClass: 'border-red-600 bg-red-950/70 text-white animate-pulse shadow-red-950/50 shadow-2xl',
      badgeClass: 'bg-red-600 text-white border-red-500 font-black',
    };
  }, [pedido.status, minutos]);

  const linkWhatsApp = useMemo(() => {
    if (!pedido.cliente?.telefone) return null;
    const telefoneLimpo = pedido.cliente.telefone.replace(/\D/g, '');
    const primeiroNome = pedido.cliente.nome.split(' ')[0] || 'Cliente';
    const texto = encodeURIComponent(
      `Olá ${primeiroNome}! 🛵 Seu pedido #${pedido.numero_diario} da Dog House acabou de sair para entrega! Avisaremos quando o motoboy estiver próximo. Obrigado!`
    );
    return `https://wa.me/55${telefoneLimpo}?text=${texto}`;
  }, [pedido.cliente, pedido.numero_diario]);

  const proximoStatusMap: Record<StatusPedido, StatusPedido | null> = {
    REALIZADO: 'SENDO_FEITO',
    SENDO_FEITO: 'PRONTO',
    PRONTO: 'EM_ROTA',
    EM_ROTA: 'CONCLUIDO',
    CONCLUIDO: null,
  };

  const proximoStatus = proximoStatusMap[pedido.status];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing space-y-2.5 shadow-md ${estiloSla.cardClass}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-white bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
            #{pedido.numero_diario.toString().padStart(2, '0')}
          </span>
          <span
            className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
              pedido.tipo_pedido === 'ENTREGA'
                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                : pedido.tipo_pedido === 'RETIRADA'
                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}
          >
            {pedido.tipo_pedido === 'ENTREGA'
              ? '🛵 Entrega'
              : pedido.tipo_pedido === 'RETIRADA'
              ? '🛍️ Retirada'
              : '🍽️ Balcão'}
          </span>
        </div>

        <span
          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${estiloSla.badgeClass}`}
        >
          ⏱️ {minutos}m {segundos.toString().padStart(2, '0')}s
        </span>
      </div>

      <div className="text-xs">
        <p className="font-bold text-white truncate">
          {pedido.cliente?.nome || 'Cliente Balcão'}
        </p>
        {pedido.entrega_bairro && (
          <p className="text-[11px] text-purple-300 font-semibold truncate">
            📍 {pedido.entrega_bairro}{' '}
            {pedido.entrega_logradouro && `• ${pedido.entrega_logradouro}, ${pedido.entrega_numero || ''}`}
          </p>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        {pedido.itens.map((item) => (
          <div key={item.id} className="text-xs space-y-1">
            <p className="font-black text-white text-[13px]">
              {item.quantidade}x {item.produto.nome}
            </p>

            {item.modo_personalizacao === 'RETIRAR' && item.itens_removidos.length > 0 && (
              <p className="text-[11px] font-bold text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-900/50">
                SEM: {item.itens_removidos.map((r) => r.ingrediente.nome).join(', ')}
              </p>
            )}

            {item.modo_personalizacao === 'SOMENTE' && item.itens_inclusos.length > 0 && (
              <p className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/50">
                SOMENTE: {item.itens_inclusos.map((i) => i.ingrediente.nome).join(', ')}
              </p>
            )}

            {item.adicionais.length > 0 && (
              <p className="text-[11px] font-bold text-amber-300">
                + {item.adicionais.map((a) => `${a.quantidade}x ${a.adicional.nome}`).join(', ')}
              </p>
            )}

            {item.observacao_item && (
              <p className="text-[10px] text-zinc-400 italic">
                Obs: {item.observacao_item}
              </p>
            )}
          </div>
        ))}
      </div>

      {pedido.observacoes_gerais && (
        <div className="p-1.5 rounded bg-zinc-800/60 border border-zinc-700/60 text-[10px] text-zinc-300 italic">
          &quot;{pedido.observacoes_gerais}&quot;
        </div>
      )}

      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1.5">
        {pedido.status === 'EM_ROTA' && linkWhatsApp && (
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow transition"
          >
            <span>💬</span>
            <span>Avisar Cliente</span>
          </a>
        )}

        {pedido.tipo_pedido === 'ENTREGA' && pedido.link_rota_maps && (
          <a
            href={pedido.link_rota_maps}
            target="_blank"
            rel="noreferrer"
            className="py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[11px] transition"
            title="Abrir Rota no Google Maps"
          >
            🗺️ Rota
          </a>
        )}

        {proximoStatus && (
          <button
            type="button"
            onClick={() => onMoverStatus(pedido.id, proximoStatus)}
            className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-[11px] flex items-center gap-1 ml-auto border border-zinc-700 transition"
          >
            <span>Avançar</span>
            <span>➔</span>
          </button>
        )}
      </div>

    </div>
  );
};