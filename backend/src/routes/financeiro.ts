import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

export const financeiroRouter = Router();

// Aplica autenticação e verificação estrita de ADMIN em todas as rotas financeiras (RN05)
financeiroRouter.use(authMiddleware);
financeiroRouter.use(requireRole(['ADMIN']));

// ==============================================================================
// 1. GET /api/admin/financeiro/caixa/resumo
// Consolidado do dia: Faturamento, Split Payments, Taxas e Saldo na Gaveta
// ==============================================================================
financeiroRouter.get('/caixa/resumo', async (req: Request, res: Response) => {
  try {
    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);

    // 1. Busca caixa aberto ou mais recente do dia
    const caixaAtivo = await prisma.caixa.findFirst({
      where: {
        OR: [
          { status: 'ABERTO' },
          { data_abertura: { gte: inicioDoDia } },
        ],
      },
      orderBy: { data_abertura: 'desc' },
      include: {
        usuario_abertura: { select: { id: true, nome: true } },
      },
    });

    const fundoAbertura = caixaAtivo ? Number(caixaAtivo.fundo_abertura) : 0;

    // 2. Busca todos os pedidos do dia que não foram cancelados
    const pedidosHoje = await prisma.pedido.findMany({
      where: {
        created_at: { gte: inicioDoDia },
        status: { not: 'CANCELADO' },
      },
      include: {
        pagamentos: true,
      },
    });

    // 3. Totais gerais
    const totalPedidos = pedidosHoje.length;
    let totalFaturado = 0;
    let totalTaxasEntrega = 0;
    let totalTrocoLevado = 0;

    // 4. Split de Pagamentos por Método
    const porMetodo: Record<string, number> = {
      PIX: 0,
      DINHEIRO: 0,
      CARTAO_CREDITO: 0,
      CARTAO_DEBITO: 0,
      VALE_REFEICAO: 0,
      OUTRO: 0,
    };

    for (const pedido of pedidosHoje) {
      totalFaturado += Number(pedido.valor_total);
      totalTaxasEntrega += Number(pedido.valor_taxa_entrega);

      if (pedido.valor_troco_calculado) {
        totalTrocoLevado += Number(pedido.valor_troco_calculado);
      }

      for (const pag of pedido.pagamentos) {
        const metodo = pag.metodo_pagamento;
        const valor = Number(pag.valor_pago);
        if (porMetodo[metodo] !== undefined) {
          porMetodo[metodo] += valor;
        } else {
          porMetodo[metodo] = valor;
        }
      }
    }

    const ticketMedio = totalPedidos > 0 ? totalFaturado / totalPedidos : 0;

    // Saldo projetado na gaveta:
    // Fundo Inicial + Entradas em Dinheiro - Trocos levados pelos motoboys
    const saldoProjetadoGaveta = fundoAbertura + porMetodo['DINHEIRO'] - totalTrocoLevado;

    // Pedidos em andamento (para alerta de Fechamento de Caixa RN06)
    const pedidosPendentes = await prisma.pedido.count({
      where: {
        created_at: { gte: inicioDoDia },
        status: { in: ['REALIZADO', 'SENDO_FEITO', 'EM_ROTA'] },
      },
    });

    return res.json({
      sucesso: true,
      caixa: caixaAtivo
        ? {
            id: caixaAtivo.id,
            status: caixaAtivo.status,
            aberto_por: caixaAtivo.usuario_abertura.nome,
            data_abertura: caixaAtivo.data_abertura,
            fundo_abertura: fundoAbertura,
          }
        : null,
      totais: {
        total_pedidos: totalPedidos,
        total_faturado: Number(totalFaturado.toFixed(2)),
        total_taxas_entrega: Number(totalTaxasEntrega.toFixed(2)),
        ticket_medio: Number(ticketMedio.toFixed(2)),
        fundo_abertura: Number(fundoAbertura.toFixed(2)),
        total_dinheiro_bruto: Number(porMetodo['DINHEIRO'].toFixed(2)),
        total_troco_levado: Number(totalTrocoLevado.toFixed(2)),
        saldo_projetado_gaveta: Number(saldoProjetadoGaveta.toFixed(2)),
        pedidos_pendentes: pedidosPendentes,
      },
      split_pagamentos: {
        PIX: Number(porMetodo['PIX'].toFixed(2)),
        DINHEIRO: Number(porMetodo['DINHEIRO'].toFixed(2)),
        CARTAO_CREDITO: Number(porMetodo['CARTAO_CREDITO'].toFixed(2)),
        CARTAO_DEBITO: Number(porMetodo['CARTAO_DEBITO'].toFixed(2)),
        VALE_REFEICAO: Number(porMetodo['VALE_REFEICAO'].toFixed(2)),
        OUTRO: Number(porMetodo['OUTRO'].toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Erro ao consultar resumo financeiro do caixa:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao consultar resumo financeiro.' });
  }
});

// ==============================================================================
// 2. GET /api/admin/financeiro/motoboys/acerto
// Consolidação dos pedidos de Entrega e Acerto Diário de Entregadores (RF18)
// ==============================================================================
financeiroRouter.get('/motoboys/acerto', async (req: Request, res: Response) => {
  try {
    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);

    const entregasHoje = await prisma.pedido.findMany({
      where: {
        created_at: { gte: inicioDoDia },
        tipo_pedido: 'ENTREGA',
        status: { not: 'CANCELADO' },
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        entregador: { select: { id: true, nome: true, placa_veiculo: true } },
        pagamentos: true,
      },
      orderBy: { created_at: 'asc' },
    });

    let totalGeralDinheiro = 0;
    let totalGeralTroco = 0;
    let totalGeralTaxas = 0;
    let totalGeralAcertar = 0;

    const pedidosFormatados = entregasHoje.map((pedido) => {
      const pagDinheiro = pedido.pagamentos.find((p) => p.metodo_pagamento === 'DINHEIRO');
      const valorDinheiro = pagDinheiro ? Number(pagDinheiro.valor_pago) : 0;
      const trocoLevado = Number(pedido.valor_troco_calculado || 0);
      const taxaEntrega = Number(pedido.valor_taxa_entrega || 0);

      // Valor a ser entregue pelo motoboy à lanchonete
      // (dinheiro cobrado do cliente menos o troco que ele levou para dar ao cliente)
      const valorAcertar = valorDinheiro;

      totalGeralDinheiro += valorDinheiro;
      totalGeralTroco += trocoLevado;
      totalGeralTaxas += taxaEntrega;
      totalGeralAcertar += valorAcertar;

      return {
        id: pedido.id,
        numero_diario: pedido.numero_diario,
        status: pedido.status,
        hora: pedido.created_at,
        cliente_nome: pedido.cliente?.nome || 'Cliente Balcão',
        cliente_telefone: pedido.cliente?.telefone || null,
        bairro: pedido.entrega_bairro,
        endereco: `${pedido.entrega_logradouro || ''}, ${pedido.entrega_numero || ''}`,
        motoboy: pedido.entregador ? pedido.entregador.nome : 'Não Atribuído',
        motoboy_placa: pedido.entregador?.placa_veiculo || null,
        valor_total: Number(pedido.valor_total),
        taxa_entrega: taxaEntrega,
        valor_dinheiro: valorDinheiro,
        troco_levado: trocoLevado,
        troco_para: pedido.troco_para ? Number(pedido.troco_para) : null,
        valor_a_acertar: valorAcertar,
        metodos_pagamento: pedido.pagamentos.map((p) => p.metodo_pagamento),
      };
    });

    return res.json({
      sucesso: true,
      resumo_geral: {
        total_entregas: entregasHoje.length,
        total_dinheiro_cobrado: Number(totalGeralDinheiro.toFixed(2)),
        total_troco_levado: Number(totalGeralTroco.toFixed(2)),
        total_taxas_repassar: Number(totalGeralTaxas.toFixed(2)),
        total_a_acertar: Number(totalGeralAcertar.toFixed(2)),
      },
      entregas: pedidosFormatados,
    });
  } catch (error) {
    console.error('Erro ao consultar acerto de motoboys:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao consultar acerto de motoboys.' });
  }
});