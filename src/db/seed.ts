import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Iniciando script de seed...');
  
  const email = 'teste@budgetbuddy.com';
  const password = '123456';
  
  try {
    // Verifica se usuário já existe
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length > 0) {
      console.log(`⚠️ Usuário ${email} já existe no banco de dados. Ignorando a criação.`);
      process.exit(0);
    }
    
    console.log(`⏳ Gerando hash para a senha...`);
    const passwordHash = await bcrypt.hash(password, 10);
    
    console.log(`⏳ Inserindo usuário no banco...`);
    await db.insert(users).values({
      name: 'Usuário de Teste',
      email: email,
      passwordHash: passwordHash,
    });
    
    console.log(`✅ Usuário criado com sucesso!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${password}`);
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
  } finally {
    process.exit(0);
  }
}

seed();
