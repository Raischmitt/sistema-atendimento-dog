import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'raissajoaquim29@gmail.com';
const ADMIN_NOME = 'Raissa (Dona)';
const ADMIN_SENHA = '270719@2026';

async function main() {
  console.log('Configurando usuario administrador oficial...\n');

  const existente = await prisma.usuario.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existente) {
    console.log('Usuario ' + ADMIN_EMAIL + ' ja existe. Atualizando senha e cargo...');
    const senhaHash = await bcrypt.hash(ADMIN_SENHA, 12);

    await prisma.usuario.update({
      where: { email: ADMIN_EMAIL },
      data: {
        nome: ADMIN_NOME,
        senha: senhaHash,
        cargo: 'ADMIN',
        ativo: true,
      },
    });

    console.log('>>> Senha e cargo atualizados com sucesso!');
  } else {
    console.log('Criando usuario: ' + ADMIN_EMAIL);
    const senhaHash = await bcrypt.hash(ADMIN_SENHA, 12);

    await prisma.usuario.create({
      data: {
        nome: ADMIN_NOME,
        email: ADMIN_EMAIL,
        senha: senhaHash,
        cargo: 'ADMIN',
        ativo: true,
      },
    });

    console.log('>>> Usuario criado com sucesso!');
  }

  console.log('\nCredenciais salvas no banco:');
  console.log('   E-mail : ' + ADMIN_EMAIL);
  console.log('   Nome   : ' + ADMIN_NOME);
  console.log('   Cargo  : ADMIN');
  console.log('   Senha  : [hash bcrypt 12 rounds - OK]');
  console.log('\nPronto!');
}

main()
  .catch((e) => {
    console.error('Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
