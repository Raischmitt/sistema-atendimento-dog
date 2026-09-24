import bcrypt from 'bcrypt';
import { PrismaClient, CategoriaProduto } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('ðŸš€ Iniciando o Seed do Banco de Dados - Dog House...\n');

  // 1. SEED: 17 Bairros Oficiais de PalhoÃ§a e Taxas de Entrega (RN09)
  console.log('ðŸ“ Cadastrando Tabela de Frete de PalhoÃ§a (17 Bairros)...');
  
  const taxasPalhoca = [
    // R$ 4,00
    { bairro: 'Aririu', valor_taxa: 4.00 },
    // R$ 5,00
    { bairro: 'Pachecos', valor_taxa: 5.00 },
    { bairro: 'Guarda', valor_taxa: 5.00 },
    { bairro: 'Alto Aririu', valor_taxa: 5.00 },
    // R$ 6,00
    { bairro: 'Nova PalhoÃ§a', valor_taxa: 6.00 },
    { bairro: 'Rio Grande', valor_taxa: 6.00 },
    { bairro: 'Bela Vista', valor_taxa: 6.00 },
    // R$ 7,00
    { bairro: 'Barra', valor_taxa: 7.00 },
    { bairro: 'Centro', valor_taxa: 7.00 },
    { bairro: 'Caminho Novo', valor_taxa: 7.00 },
    { bairro: 'Pagani', valor_taxa: 7.00 },
    { bairro: 'Passa Vinte', valor_taxa: 7.00 },
    // R$ 8,00
    { bairro: 'SÃ£o SebastiÃ£o', valor_taxa: 8.00 },
    { bairro: 'Jardim Eldorado', valor_taxa: 8.00 },
    { bairro: 'Ponte do Imaruim', valor_taxa: 8.00 },
    { bairro: 'Formiga', valor_taxa: 8.00 },
    { bairro: 'Pontal', valor_taxa: 8.00 },
  ];

  for (const taxa of taxasPalhoca) {
    await prisma.taxaPalhoca.upsert({
      where: { bairro: taxa.bairro },
      update: { valor_taxa: taxa.valor_taxa, ativo: true },
      create: { bairro: taxa.bairro, valor_taxa: taxa.valor_taxa, ativo: true },
    });
  }
  console.log(`âœ… ${taxasPalhoca.length} bairros sincronizados com sucesso.`);

  // 2. SEED: Ingredientes Base
  console.log('\nðŸ¥— Cadastrando Ingredientes Base...');

  const ingredientesLista = [
    { nome: 'Salsicha', unidade_medida: 'UN' },
    { nome: 'Batata palha', unidade_medida: 'G' },
    { nome: 'Queijo colonial', unidade_medida: 'G' },
    { nome: 'Queijo mussarela', unidade_medida: 'G' },
    { nome: 'Molho da panela', unidade_medida: 'G' },
    { nome: 'Repolho', unidade_medida: 'G' },
    { nome: 'Cebola', unidade_medida: 'G' },
    { nome: 'Tomate', unidade_medida: 'G' },
    { nome: 'Milho', unidade_medida: 'G' },
    { nome: 'Ervilha', unidade_medida: 'G' },
    { nome: 'Maionese', unidade_medida: 'G' },
    { nome: 'Ketchup', unidade_medida: 'G' },
    { nome: 'Mostarda', unidade_medida: 'G' },
    { nome: 'Ovo de codorna', unidade_medida: 'UN' },
    { nome: 'Bacon', unidade_medida: 'G' },
    { nome: 'Calabresa', unidade_medida: 'G' },
    { nome: 'Frango desfiado', unidade_medida: 'G' },
    { nome: 'RequeijÃ£o', unidade_medida: 'G' },
  ];

  const ingredientesMap = new Map<string, string>();

  for (const ing of ingredientesLista) {
    const saved = await prisma.ingrediente.upsert({
      where: { nome: ing.nome },
      update: { unidade_medida: ing.unidade_medida, ativo: true },
      create: { nome: ing.nome, estoque_atual: 1000, unidade_medida: ing.unidade_medida, ativo: true },
    });
    ingredientesMap.set(saved.nome, saved.id);
  }
  console.log(`âœ… ${ingredientesLista.length} ingredientes base sincronizados.`);

  // 3. SEED: Adicionais Avulsos
  console.log('\nðŸ¥“ Cadastrando Adicionais Avulsos...');

  const adicionaisLista = [
    { nome: 'Bacon', preco: 6.00, ingredienteNome: 'Bacon' },
    { nome: 'Calabresa', preco: 6.00, ingredienteNome: 'Calabresa' },
    { nome: 'Frango', preco: 6.00, ingredienteNome: 'Frango desfiado' },
    { nome: 'Queijo', preco: 6.00, ingredienteNome: 'Queijo mussarela' },
    { nome: 'Salsicha', preco: 2.50, ingredienteNome: 'Salsicha' },
  ];

  for (const adic of adicionaisLista) {
    const ingredienteId = ingredientesMap.get(adic.ingredienteNome);
    await prisma.adicional.upsert({
      where: { nome: adic.nome },
      update: { preco: adic.preco, ingrediente_id: ingredienteId, ativo: true },
      create: { nome: adic.nome, preco: adic.preco, ingrediente_id: ingredienteId, ativo: true },
    });
  }
  console.log(`âœ… ${adicionaisLista.length} adicionais sincronizados.`);

  // 4. SEED: Produtos e Fichas TÃ©cnicas
  console.log('\nðŸŒ­ Cadastrando Lanches e Fichas TÃ©cnicas...');

  type ProdutoSeed = {
    nome: string;
    categoria: CategoriaProduto;
    preco: number;
    descricao: string;
    ordem: number;
    ingredientes: { nome: string; quantidade: number }[];
  };

  const produtos: ProdutoSeed[] = [
    {
      nome: 'Tradicional Simples',
      categoria: CategoriaProduto.TRADICIONAIS,
      preco: 15.50,
      descricao: '1 salsicha, batata palha, queijo colonial, queijo mussarela, molho da panela, repolho, cebola, tomate, milho, ervilha, maionese, ketchup, mostarda.',
      ordem: 1,
      ingredientes: [
        { nome: 'Salsicha', quantidade: 1 },
        { nome: 'Batata palha', quantidade: 1 },
        { nome: 'Queijo colonial', quantidade: 1 },
        { nome: 'Queijo mussarela', quantidade: 1 },
        { nome: 'Molho da panela', quantidade: 1 },
        { nome: 'Repolho', quantidade: 1 },
        { nome: 'Cebola', quantidade: 1 },
        { nome: 'Tomate', quantidade: 1 },
        { nome: 'Milho', quantidade: 1 },
        { nome: 'Ervilha', quantidade: 1 },
        { nome: 'Maionese', quantidade: 1 },
        { nome: 'Ketchup', quantidade: 1 },
        { nome: 'Mostarda', quantidade: 1 },
      ],
    },
    {
      nome: 'Tradicional Duplo',
      categoria: CategoriaProduto.TRADICIONAIS,
      preco: 17.50,
      descricao: '2 salsichas, batata palha, queijo colonial, queijo mussarela, molho da panela, repolho, cebola, tomate, milho, ervilha, maionese, ketchup, mostarda.',
      ordem: 2,
      ingredientes: [
        { nome: 'Salsicha', quantidade: 2 },
        { nome: 'Batata palha', quantidade: 1 },
        { nome: 'Queijo colonial', quantidade: 1 },
        { nome: 'Queijo mussarela', quantidade: 1 },
        { nome: 'Molho da panela', quantidade: 1 },
        { nome: 'Repolho', quantidade: 1 },
        { nome: 'Cebola', quantidade: 1 },
        { nome: 'Tomate', quantidade: 1 },
        { nome: 'Milho', quantidade: 1 },
        { nome: 'Ervilha', quantidade: 1 },
        { nome: 'Maionese', quantidade: 1 },
        { nome: 'Ketchup', quantidade: 1 },
        { nome: 'Mostarda', quantidade: 1 },
      ],
    },
    {
      nome: 'Prensado Simples',
      categoria: CategoriaProduto.PRENSADOS,
      preco: 25.50,
      descricao: '1 salsicha, batata palha, queijo mussarela, tomate, milho, ervilha, maionese, ketchup, mostarda, ovo de codorna.',
      ordem: 3,
      ingredientes: [
        { nome: 'Salsicha', quantidade: 1 },
        { nome: 'Batata palha', quantidade: 1 },
        { nome: 'Queijo mussarela', quantidade: 1 },
        { nome: 'Tomate', quantidade: 1 },
        { nome: 'Milho', quantidade: 1 },
        { nome: 'Ervilha', quantidade: 1 },
        { nome: 'Maionese', quantidade: 1 },
        { nome: 'Ketchup', quantidade: 1 },
        { nome: 'Mostarda', quantidade: 1 },
        { nome: 'Ovo de codorna', quantidade: 1 },
      ],
    },
    {
      nome: 'Prensado Duplo',
      categoria: CategoriaProduto.PRENSADOS,
      preco: 27.50,
      descricao: '2 salsichas, batata palha, queijo mussarela, tomate, milho, ervilha, maionese, ketchup, mostarda, ovo de codorna.',
      ordem: 4,
      ingredientes: [
        { nome: 'Salsicha', quantidade: 2 },
        { nome: 'Batata palha', quantidade: 1 },
        { nome: 'Queijo mussarela', quantidade: 1 },
        { nome: 'Tomate', quantidade: 1 },
        { nome: 'Milho', quantidade: 1 },
        { nome: 'Ervilha', quantidade: 1 },
        { nome: 'Maionese', quantidade: 1 },
        { nome: 'Ketchup', quantidade: 1 },
        { nome: 'Mostarda', quantidade: 1 },
        { nome: 'Ovo de codorna', quantidade: 1 },
      ],
    },
    {
      nome: 'Prensado Bacon',
      categoria: CategoriaProduto.PRENSADOS,
      preco: 31.50,
      descricao: '1 salsicha, muito bacon, batata palha, queijo mussarela, tomate, milho, ervilha, maionese, ketchup, mostarda, ovo de codorna.',
      ordem: 5,
      ingredientes: [
        { nome: 'Salsicha', quantidade: 1 },
        { nome: 'Bacon', quantidade: 1 },
        { nome: 'Batata palha', quantidade: 1 },
        { nome: 'Queijo mussarela', quantidade: 1 },
        { nome: 'Tomate', quantidade: 1 },
        { nome: 'Milho', quantidade: 1 },
        { nome: 'Ervilha', quantidade: 1 },
        { nome: 'Maionese', quantidade: 1 },
        { nome: 'Ketchup', quantidade: 1 },
        { nome: 'Mostarda', quantidade: 1 },
        { nome: 'Ovo de codorna', quantidade: 1 },
      ],
    },
    {
      nome: 'Prensado Calabresa',
      categoria: CategoriaProduto.PRENSADOS,
      preco: 31.50,
      descricao: '1 salsicha, muita calabresa, batata palha, queijo mussarela, tomate, milho, ervilha, maionese, ketchup, mostarda, ovo de codorna.',
      ordem: 6,
      ingredientes: [
        { nome: 'Salsicha', quantidade: 1 },
        { nome: 'Calabresa', quantidade: 1 },
        { nome: 'Batata palha', quantidade: 1 },
        { nome: 'Queijo mussarela', quantidade: 1 },
        { nome: 'Tomate', quantidade: 1 },
        { nome: 'Milho', quantidade: 1 },
        { nome: 'Ervilha', quantidade: 1 },
        { nome: 'Maionese', quantidade: 1 },
        { nome: 'Ketchup', quantidade: 1 },
        { nome: 'Mostarda', quantidade: 1 },
        { nome: 'Ovo de codorna', quantidade: 1 },
      ],
    },
    {
      nome: 'Prensado Frango',
      categoria: CategoriaProduto.PRENSADOS,
      preco: 31.50,
      descricao: '1 salsicha, frango desfiado, requeijÃ£o, batata palha, queijo mussarela, tomate, milho, ervilha, maionese, ketchup, mostarda, ovo de codorna.',
      ordem: 7,
      ingredientes: [
        { nome: 'Salsicha', quantidade: 1 },
        { nome: 'Frango desfiado', quantidade: 1 },
        { nome: 'RequeijÃ£o', quantidade: 1 },
        { nome: 'Batata palha', quantidade: 1 },
        { nome: 'Queijo mussarela', quantidade: 1 },
        { nome: 'Tomate', quantidade: 1 },
        { nome: 'Milho', quantidade: 1 },
        { nome: 'Ervilha', quantidade: 1 },
        { nome: 'Maionese', quantidade: 1 },
        { nome: 'Ketchup', quantidade: 1 },
        { nome: 'Mostarda', quantidade: 1 },
        { nome: 'Ovo de codorna', quantidade: 1 },
      ],
    },
  ];

  for (const prod of produtos) {
    const produtoCriado = await prisma.produto.upsert({
      where: { nome: prod.nome },
      update: {
        categoria: prod.categoria,
        preco: prod.preco,
        descricao: prod.descricao,
        ordem_exibicao: prod.ordem,
        ativo: true,
      },
      create: {
        nome: prod.nome,
        categoria: prod.categoria,
        preco: prod.preco,
        descricao: prod.descricao,
        ordem_exibicao: prod.ordem,
        ativo: true,
      },
    });

    for (const itemIng of prod.ingredientes) {
      const ingredienteId = ingredientesMap.get(itemIng.nome);
      if (ingredienteId) {
        await prisma.produtoFichaTecnica.upsert({
          where: {
            produto_id_ingrediente_id: {
              produto_id: produtoCriado.id,
              ingrediente_id: ingredienteId,
            },
          },
          update: { quantidade_padrao: itemIng.quantidade },
          create: {
            produto_id: produtoCriado.id,
            ingrediente_id: ingredienteId,
            quantidade_padrao: itemIng.quantidade,
          },
        });
      }
    }
    console.log(`  ðŸŒ­ ${prod.nome} cadastrado.`);
  }

  // 5. SEED: UsuÃ¡rio Admin
  console.log('\nðŸ‘¤ Cadastrando UsuÃ¡rio Administrador...');
  await prisma.usuario.upsert({
    where: { email: 'admin@doghouse.com' },
    update: {},
    create: {
      nome: 'Administrador Dog House',
      email: 'admin@doghouse.com',
      senha: bcrypt.hashSync('admin123', 10),
      cargo: 'ADMIN',
      ativo: true,
    },
  });

  console.log('\nðŸŽ‰ Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('âŒ Erro durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
