'use server';

import { db } from '@/db';
import { allocationRules, settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export interface AllocationRuleInput {
  id?: string;
  name: string;
  percentage: number;
}

export interface AllocationSettingsResponse {
  baseKeepAmount: number;
  rules: Array<{
    id: string;
    userId: string;
    name: string;
    percentage: number;
    createdAt: Date;
  }>;
}

export async function getAllocationSettings(): Promise<AllocationSettingsResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const [appSettings] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
    
  const baseKeepAmount = appSettings?.baseKeepAmount ? Number(appSettings.baseKeepAmount) : 0;

  const rules = await db
    .select()
    .from(allocationRules)
    .where(eq(allocationRules.userId, userId));

  return {
    baseKeepAmount,
    rules: rules.map(rule => ({
      ...rule,
      percentage: Number(rule.percentage)
    }))
  };
}

export async function saveAllocationSettings(
  baseKeepAmount: number,
  rules: Array<AllocationRuleInput>
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Validação: se houver regras, a soma deve ser exatamente 100%
  if (rules.length > 0) {
    const totalPercentage = rules.reduce((acc, rule) => acc + rule.percentage, 0);
    
    // Tratando precisão de ponto flutuante
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return { success: false, error: 'A distribuição deve fechar em exatamente 100%.' };
    }
  }

  try {
    await db.transaction(async (tx) => {
      // Atualiza baseKeepAmount
      const [appSettings] = await tx
        .select()
        .from(settings)
        .where(eq(settings.userId, userId))
        .limit(1);
        
      if (appSettings) {
        await tx.update(settings)
          .set({ baseKeepAmount: baseKeepAmount.toString() })
          .where(eq(settings.userId, userId));
      } else {
        await tx.insert(settings)
          .values({ 
            userId, 
            closingDay: 1, 
            baseKeepAmount: baseKeepAmount.toString() 
          });
      }

      // Limpa as regras antigas
      await tx.delete(allocationRules).where(eq(allocationRules.userId, userId));

      // Insere as novas regras
      if (rules.length > 0) {
        await tx.insert(allocationRules).values(
          rules.map(rule => ({
            userId,
            name: rule.name,
            percentage: rule.percentage.toString(),
          }))
        );
      }
    });

    // Revalidação de rotas que possivelmente consumam essas informações
    revalidatePath('/allocations');
    revalidatePath('/dashboard');
    
    return { success: true };
  } catch (error) {
    console.error('Error saving allocation settings:', error);
    return { success: false, error: 'Falha ao salvar configurações de distribuição.' };
  }
}
