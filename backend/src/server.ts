import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole, JWT_SECRET } from './middlewares/authMiddleware';
import { financeiroRouter } from './routes/financeiro';

export const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use('/api/admin/financeiro', financeiroRouter);

export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

io.on('connection', (socket) => {
  console.log(`âš¡ Cliente conectado: ${socket.id}`);

  socket.on('kanban:join', () => {
    socket.join('kanban_room');
    console.log(`ðŸ“‹ Socket ${socket.id} entrou em kanban_room`);
  });

  socket.on('disconnect', () => {
    console.log(`ðŸ”Œ Cliente desconectado: ${socket.id}`);
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==============================================================================
// ROTAS DE AUTENTICAÃ‡ÃƒO
// ==============================================================================
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'E-mail e senha sÃ£o obrigatÃ³rios.',
    });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Credenciais invÃ¡lidas ou usuÃ¡rio inativo.',
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Credenciais invÃ¡lidas.',
      });
    }

    const payload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    return res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso!',
      token,
      usuario: payload,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao autenticar.' });
  }
});

app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
  return res.json({
    sucesso: true,
    usuario: req.user,
  });
});

// ==============================================================================
// ROTAS DO CARDÃPIO E PEDIDOS
// ==============================================================================
app.get('/api/public/cardapio', async (_req: Request, res: Response) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { ordem_exibicao: 'asc' },
      include: {
        ficha_tecnica: {
          include: {
            ingrediente: {
              select: { id: true, nome: true, unidade_medida: true },
            },
          },
        },
      },
    });

    const adicionais = await prisma.adicional.findMany({
      where: { ativo: true },
      orderBy: { preco: 'asc' },
      select: { id: true, nome: true, preco: true },
    });

    const cardapioFormatado = produtos.map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria,
      descricao: p.descricao,
      preco: Number(p.preco),
      ingredientes_padrao: p.ficha_tecnica.map((ft) => ({
        ingrediente_id: ft.ingrediente.id,
        nome: ft.ingrediente.nome,
        quantidade_padrao: Number(ft.quantidade_padrao),
        unidade_medida: ft.ingrediente.unidade_medida,
      })),
    }));

    return res.status(200).json({
      sucesso: true,
      total_produtos: cardapioFormatado.length,
      adicionais_disponiveis: adicionais.map((a) => ({
        id: a.id,
        nome: a.nome,
        preco: Number(a.preco),
      })),
      cardapio: cardapioFormatado,
    });
  } catch (error) {
    console.error('Erro ao consultar cardÃ¡pio:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao consultar o cardÃ¡pio.' });
  }
});

app.post('/api/pedidos', async (req: Request, res: Response) => {
  const { tipo_pedido, cliente, logistica, financeiro, itens } = req.body;

  try {
    const pedidoCriado = await prisma.$transaction(async (tx) => {
      let caixaAtivo = await tx.caixa.findFirst({
        where: { status: 'ABERTO' },
        orderBy: { data_abertura: 'desc' },
      });

      if (!caixaAtivo) {
        let usuarioPadrao = await tx.usuario.findFirst();
        if (!usuarioPadrao) {
          usuarioPadrao = await tx.usuario.create({
            data: {
              nome: 'Admin Dog House',
              email: 'admin@doghouse.com',
              senha: bcrypt.hashSync('admin123', 10),
              cargo: 'ADMIN',
            },
          });
        }
        caixaAtivo = await tx.caixa.create({
          data: {
            usuario_abertura_id: usuarioPadrao.id,
            fundo_abertura: 100.0,
            status: 'ABERTO',
          },
        });
      }

      let clienteId: string | null = null;
      if (cliente?.telefone) {
        const clienteRecord = await tx.cliente.upsert({
          where: { telefone: cliente.telefone },
          update: {
            nome: cliente.nome || 'Cliente',
            total_pedidos: { increment: 1 },
          },
          create: {
            telefone: cliente.telefone,
            nome: cliente.nome || 'Cliente',
            total_pedidos: 1,
            opt_in_whatsapp: true,
          },
        });
        clienteId = clienteRecord.id;
      }

      const inicioDoDia = new Date();
      inicioDoDia.setHours(0, 0, 0, 0);
      const totalHoje = await tx.pedido.count({
        where: { created_at: { gte: inicioDoDia } },
      });
      const numeroDiario = totalHoje + 1;

      let linkMaps: string | null = null;
      if (tipo_pedido === 'ENTREGA' && logistica) {
        const enderecoQuery = encodeURIComponent(
          `${logistica.logradouro}, ${logistica.numero}, ${logistica.bairro}, Palhoca - SC`
        );
        linkMaps = `https://www.google.com/maps/search/?api=1&query=${enderecoQuery}`;
      }

      const novoPedido = await tx.pedido.create({
        data: {
          numero_diario: numeroDiario,
          tipo_pedido: tipo_pedido,
          status: 'REALIZADO',
          cliente_id: clienteId,
          usuario_id: caixaAtivo.usuario_abertura_id,
          caixa_id: caixaAtivo.id,
          valor_produtos: financeiro.subtotal,
          valor_taxa_entrega: financeiro.taxa_entrega || 0,
          valor_total: financeiro.total,
          troco_para: financeiro.troco_para || null,
          valor_troco_calculado: financeiro.troco_a_levar || null,
          entrega_logradouro: logistica?.logradouro || null,
          entrega_numero: logistica?.numero || null,
          entrega_complemento: logistica?.complemento || null,
          entrega_bairro: logistica?.bairro || null,
          entrega_referencia: logistica?.referencia || null,
          link_rota_maps: linkMaps,
        },
      });

      if (financeiro?.pagamentos) {
        for (const pag of financeiro.pagamentos) {
          await tx.pagamentoPedido.create({
            data: {
              pedido_id: novoPedido.id,
              metodo_pagamento: pag.metodo,
              valor_pago: pag.valor,
            },
          });
        }
      }

      for (const item of itens) {
        const itemCriado = await tx.itemPedido.create({
          data: {
            pedido_id: novoPedido.id,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario: item.subtotal / item.quantidade,
            subtotal: item.subtotal,
            modo_personalizacao: item.modo,
            observacao_item: item.observacao || null,
          },
        });

        if (item.adicionais && item.adicionais.length > 0) {
          for (const adic of item.adicionais) {
            await tx.itemPedidoAdicional.create({
              data: {
                item_pedido_id: itemCriado.id,
                adicional_id: adic.adicional_id,
                quantidade: adic.quantidade,
                preco_unitario: adic.preco_unitario,
                subtotal: adic.preco_unitario * adic.quantidade,
              },
            });

            const adicDb = await tx.adicional.findUnique({ where: { id: adic.adicional_id } });
            if (adicDb?.ingrediente_id) {
              await tx.ingrediente.update({
                where: { id: adicDb.ingrediente_id },
                data: { estoque_atual: { decrement: adic.quantidade } },
              });
            }
          }
        }

        const fichaTecnica = await tx.produtoFichaTecnica.findMany({
          where: { produto_id: item.produto_id },
        });

        if (item.modo === 'RETIRAR') {
          const idsRemovidos: string[] = item.itens_removidos || [];
          for (const ingId of idsRemovidos) {
            await tx.itemRemovido.create({
              data: { item_pedido_id: itemCriado.id, ingrediente_id: ingId },
            });
          }

          for (const insumo of fichaTecnica) {
            if (!idsRemovidos.includes(insumo.ingrediente_id)) {
              const qtdConsumo = Number(insumo.quantidade_padrao) * item.quantidade;
              await tx.ingrediente.update({
                where: { id: insumo.ingrediente_id },
                data: { estoque_atual: { decrement: qtdConsumo } },
              });
            }
          }
        } else {
          const idsInclusos: string[] = item.itens_inclusos || [];
          for (const ingId of idsInclusos) {
            await tx.itemIncluso.create({
              data: { item_pedido_id: itemCriado.id, ingrediente_id: ingId },
            });

            const insumoFt = fichaTecnica.find((f) => f.ingrediente_id === ingId);
            const qtdPadrao = insumoFt ? Number(insumoFt.quantidade_padrao) : 1;
            await tx.ingrediente.update({
              where: { id: ingId },
              data: { estoque_atual: { decrement: qtdPadrao * item.quantidade } },
            });
          }
        }
      }

      return await tx.pedido.findUnique({
        where: { id: novoPedido.id },
        include: {
          cliente: true,
          pagamentos: true,
          itens: {
            include: {
              produto: true,
              itens_removidos: { include: { ingrediente: true } },
              itens_inclusos: { include: { ingrediente: true } },
              adicionais: { include: { adicional: true } },
            },
          },
        },
      });
    });

    io.to('kanban_room').emit('novo_pedido', pedidoCriado);

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Pedido gravado com sucesso!',
      pedido: pedidoCriado,
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao salvar pedido.' });
  }
});

app.get('/api/pedidos', async (_req: Request, res: Response) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        status: { in: ['REALIZADO', 'SENDO_FEITO', 'PRONTO', 'EM_ROTA', 'CONCLUIDO'] },
      },
      orderBy: { created_at: 'asc' },
      include: {
        cliente: true,
        pagamentos: true,
        itens: {
          include: {
            produto: true,
            itens_removidos: { include: { ingrediente: true } },
            itens_inclusos: { include: { ingrediente: true } },
            adicionais: { include: { adicional: true } },
          },
        },
      },
    });

    return res.json({ sucesso: true, pedidos });
  } catch (error) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar pedidos.' });
  }
});

app.patch('/api/pedidos/:id/status', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { status } = req.body;

  try {
    const dadosAtualizacao: any = { status };
    if (status === 'SENDO_FEITO') dadosAtualizacao.tempo_inicio_preparo = new Date();
    if (status === 'PRONTO') dadosAtualizacao.tempo_pronto = new Date();
    if (status === 'EM_ROTA') dadosAtualizacao.tempo_saida_entrega = new Date();
    if (status === 'CONCLUIDO') dadosAtualizacao.tempo_concluido = new Date();

    const pedidoAtualizado = await prisma.pedido.update({
      where: { id },
      data: dadosAtualizacao,
      include: {
        cliente: true,
        pagamentos: true,
        itens: {
          include: {
            produto: true,
            itens_removidos: { include: { ingrediente: true } },
            itens_inclusos: { include: { ingrediente: true } },
            adicionais: { include: { adicional: true } },
          },
        },
      },
    });

    io.to('kanban_room').emit('pedido_atualizado', pedidoAtualizado);

    return res.json({ sucesso: true, pedido: pedidoAtualizado });
  } catch (error) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar status.' });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`ðŸš€ Servidor Dog House rodando na porta ${PORT}`);
  console.log(`ðŸ“¡ WebSocket pronto para conexÃµes (kanban_room)`);
});