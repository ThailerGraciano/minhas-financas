'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function registerUser(data: { name: string; email: string; password: string }) {
  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (existingUser) {
      return { success: false, error: 'Este e-mail já está em uso.' };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    await db.insert(users).values({
      name: data.name,
      email: data.email,
      passwordHash,
    });

    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Ocorreu um erro ao criar a conta.' };
  }
}
