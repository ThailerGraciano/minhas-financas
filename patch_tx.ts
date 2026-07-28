import fs from 'fs';
let content = fs.readFileSync('src/app/actions/transactions.ts', 'utf-8');

// 1. In getTransactions, add destinationAccount to with
content = content.replace(/with: \{\s*account: true,\s*category: true,\s*creditCard: true,\s*\}/, `with: {
      account: true,
      category: true,
      creditCard: true,
      destinationAccount: true,
    }`);

// 2. In getTransactions, replace the mapping of virtualTransactions
const virtualTxStart = content.indexOf('    .map((ft) => {');
const virtualTxEnd = content.indexOf('    .filter((t): t is NonNullable<typeof t> => t !== null);');

const virtualTxReplacement = `    .flatMap((ft) => {
      const dayStr = ft.startDate.split("-")[2];
      const dayNum = parseInt(dayStr, 10);

      let targetMonthDate = new Date(monthDate);
      if (dayNum > closingDay) {
        targetMonthDate = subMonths(targetMonthDate, 1);
      }

      const targetDate = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), dayNum);
      const finalDate = targetDate.getMonth() !== targetMonthDate.getMonth() ? endOfMonth(targetMonthDate) : targetDate;
      const dateStr = format(finalDate, "yyyy-MM-dd");

      if (dateStr < ft.startDate) return [];

      const tempId = -Math.floor(Math.random() * 1000000) - 1;

      const origin = {
        id: tempId,
        userId: userId,
        type: ft.type,
        accountId: ft.accountId,
        creditCardId: ft.creditCardId,
        categoryId: ft.categoryId,
        subcategoryId: ft.subcategoryId,
        amount: ft.amount,
        description: ft.type === "transfer" ? \`\${ft.description} (Saída)\` : ft.description,
        date: dateStr,
        competencyMonth: currentMonth,
        status: "pending",
        isFixed: false,
        fixedTransactionId: ft.id,
        installmentCurrent: null,
        installmentTotal: null,
        parentTransactionId: null,
        installmentParentId: null,
        observations: null,
        paidAt: null,
        account: ft.account,
        category: ft.category,
        creditCard: ft.creditCard,
      } as any;

      if (ft.type === "transfer" && ft.destinationAccountId) {
        const dest = {
          ...origin,
          id: tempId - 1,
          accountId: ft.destinationAccountId,
          description: \`\${ft.description} (Entrada)\`,
          parentTransactionId: origin.id,
          account: ft.destinationAccount,
        } as any;
        return [origin, dest];
      }

      return [origin];
    })
    .filter((t) => t !== null);`;
content = content.substring(0, virtualTxStart) + virtualTxReplacement + content.substring(virtualTxEnd + 59);

// 3. createTransaction - replace the type === "transfer" early return and the isFixed/installment blocks
const createTxStart = content.indexOf('    const { isFixed, destinationAccountId, isTotalAmount, current_installment, ...txData } = data;');
const createTxEnd = content.indexOf('  } catch (error) {');
const createTxReplacement = `    const { isFixed, destinationAccountId, isTotalAmount, current_installment, ...txData } = data;
    const isTransfer = txData.type === "transfer" && destinationAccountId;

    if (isFixed) {
      const result = await db.transaction(async (tx) => {
        const [fixedTx] = await tx
          .insert(fixedTransactions)
          .values({
            userId,
            type: txData.type,
            accountId: txData.accountId!,
            creditCardId: txData.creditCardId || null,
            categoryId: txData.categoryId,
            subcategoryId: txData.subcategoryId || null,
            amount: txData.amount,
            description: txData.description,
            startDate: txData.date,
            active: true,
            destinationAccountId: destinationAccountId || null,
          })
          .returning();

        const baseDate = parseISO(txData.date);

        for (let i = 0; i < 12; i++) {
          const nextDate = addMonths(baseDate, i);
          
          if (isTransfer) {
            const [originTx] = await tx.insert(transactions).values({
              ...txData,
              userId,
              description: \`\${txData.description} (Saída)\`,
              date: format(nextDate, "yyyy-MM-dd"),
              competencyMonth: format(nextDate, "yyyy-MM"),
              status: i === 0 ? txData.status || "pending" : "pending",
              fixedTransactionId: fixedTx.id,
            }).returning();
            
            await tx.insert(transactions).values({
              ...txData,
              userId,
              accountId: destinationAccountId,
              description: \`\${txData.description} (Entrada)\`,
              date: format(nextDate, "yyyy-MM-dd"),
              competencyMonth: format(nextDate, "yyyy-MM"),
              status: i === 0 ? txData.status || "pending" : "pending",
              fixedTransactionId: fixedTx.id,
              parentTransactionId: originTx.id,
            });
          } else {
             await tx.insert(transactions).values({
              ...txData,
              userId,
              date: format(nextDate, "yyyy-MM-dd"),
              competencyMonth: format(nextDate, "yyyy-MM"),
              status: i === 0 ? txData.status || "pending" : "pending",
              fixedTransactionId: fixedTx.id,
            });
          }
        }
        return { success: true };
      });

      revalidatePath("/transactions");
      revalidatePath("/");
      revalidatePath("/planning");
      return result;
    }

    if (txData.installmentTotal && txData.installmentTotal > 1) {
      let baseParcelAmount = txData.amount;
      let lastParcelAmount = txData.amount;

      if (isTotalAmount) {
        const total = Number(txData.amount);
        const installmentValue = Math.round((total / txData.installmentTotal) * 100) / 100;
        baseParcelAmount = installmentValue.toFixed(2);

        const sumWithoutLast = installmentValue * (txData.installmentTotal - 1);
        const lastValue = Math.round((total - sumWithoutLast) * 100) / 100;
        lastParcelAmount = lastValue.toFixed(2);
      }

      const currentInstallment = current_installment || 1;
      
      const result = await db.transaction(async (tx) => {
          let originParentId: number | null = null;
          let destParentId: number | null = null;
          let finalReturnId: number | undefined = undefined;

          if (isTransfer) {
             const [originTx] = await tx.insert(transactions).values({
                ...txData,
                description: \`\${txData.description} (\${currentInstallment}/\${txData.installmentTotal}) (Saída)\`,
                userId,
                amount: currentInstallment === txData.installmentTotal ? lastParcelAmount : baseParcelAmount,
                installmentCurrent: currentInstallment,
             }).returning();
             originParentId = originTx.id;
             finalReturnId = originTx.id;

             const [destTx] = await tx.insert(transactions).values({
                ...txData,
                accountId: destinationAccountId,
                description: \`\${txData.description} (\${currentInstallment}/\${txData.installmentTotal}) (Entrada)\`,
                userId,
                amount: currentInstallment === txData.installmentTotal ? lastParcelAmount : baseParcelAmount,
                installmentCurrent: currentInstallment,
                parentTransactionId: originTx.id,
             }).returning();
             destParentId = destTx.id;
          } else {
             const [parentTx] = await tx.insert(transactions).values({
                ...txData,
                description: \`\${txData.description} (\${currentInstallment}/\${txData.installmentTotal})\`,
                userId,
                amount: currentInstallment === txData.installmentTotal ? lastParcelAmount : baseParcelAmount,
                installmentCurrent: currentInstallment,
             }).returning();
             originParentId = parentTx.id;
             finalReturnId = parentTx.id;
          }

          const baseDate = parseISO(data.date);
          const baseCompetency = txData.competencyMonth ? parseISO(\`\${txData.competencyMonth}-01\`) : baseDate;

          for (let i = currentInstallment + 1; i <= txData.installmentTotal; i++) {
             const nextDate = addMonths(baseDate, i - currentInstallment);
             const nextCompetency = addMonths(baseCompetency, i - currentInstallment);
             const isLast = i === txData.installmentTotal;

             if (isTransfer) {
                const [originTx] = await tx.insert(transactions).values({
                  ...txData,
                  description: \`\${txData.description} (\${i}/\${txData.installmentTotal}) (Saída)\`,
                  userId,
                  amount: isLast ? lastParcelAmount : baseParcelAmount,
                  date: format(nextDate, "yyyy-MM-dd"),
                  competencyMonth: format(nextCompetency, "yyyy-MM"),
                  status: "pending",
                  installmentCurrent: i,
                  installmentParentId: originParentId,
                }).returning();
                
                await tx.insert(transactions).values({
                  ...txData,
                  accountId: destinationAccountId,
                  description: \`\${txData.description} (\${i}/\${txData.installmentTotal}) (Entrada)\`,
                  userId,
                  amount: isLast ? lastParcelAmount : baseParcelAmount,
                  date: format(nextDate, "yyyy-MM-dd"),
                  competencyMonth: format(nextCompetency, "yyyy-MM"),
                  status: "pending",
                  installmentCurrent: i,
                  parentTransactionId: originTx.id,
                  installmentParentId: destParentId,
                });
             } else {
                await tx.insert(transactions).values({
                  ...txData,
                  description: \`\${txData.description} (\${i}/\${txData.installmentTotal})\`,
                  userId,
                  amount: isLast ? lastParcelAmount : baseParcelAmount,
                  date: format(nextDate, "yyyy-MM-dd"),
                  competencyMonth: format(nextCompetency, "yyyy-MM"),
                  status: "pending",
                  installmentCurrent: i,
                  installmentParentId: originParentId,
                });
             }
          }
          return { success: true, parentId: finalReturnId };
      });
      revalidatePath("/transactions");
      revalidatePath("/");
      revalidatePath("/planning");
      return result;
    }

    if (isTransfer) {
      const result = await db.transaction(async (tx) => {
        const [originTx] = await tx
          .insert(transactions)
          .values({
            ...txData,
            userId,
            description: \`\${txData.description} (Saída)\`,
          })
          .returning();

        await tx.insert(transactions).values({
          ...txData,
          userId,
          accountId: destinationAccountId,
          description: \`\${txData.description} (Entrada)\`,
          parentTransactionId: originTx.id,
        });

        return { success: true, parentId: originTx.id };
      });

      revalidatePath("/transactions");
      revalidatePath("/");
      revalidatePath("/planning");
      return result;
    } else {
      await db.insert(transactions).values({ ...txData, userId });

      revalidatePath("/transactions");
      revalidatePath("/");
      revalidatePath("/planning");
      return { success: true };
    }
`;
content = content.substring(0, createTxStart) + createTxReplacement + content.substring(createTxEnd);

// 4. deleteTransaction
const deleteTxStart = content.indexOf('      if (mode === "future") {');
const deleteTxEnd = content.indexOf('      } else {');
const deleteTxReplacement = `      if (mode === "future") {
        const targetDate = transactionItem.date;
        const parentId = transactionItem.installmentParentId || transactionItem.parentTransactionId || transactionItem.id;
        
        let fixedCond = undefined;
        if (transactionItem.fixedTransactionId) {
           fixedCond = eq(transactions.fixedTransactionId, transactionItem.fixedTransactionId);
        }

        const txsToDelete = await tx
          .select()
          .from(transactions)
          .where(
            and(
              or(
                eq(transactions.installmentParentId, parentId),
                eq(transactions.parentTransactionId, parentId),
                eq(transactions.id, parentId),
                fixedCond
              ),
              gte(transactions.date, targetDate),
              eq(transactions.userId, userId),
            ),
          );

        const idsToDelete = txsToDelete.map((t) => t.id);
        
        // delete all linked destinations first if any
        for (const targetId of idsToDelete) {
           const linkedDests = await tx.select().from(transactions).where(eq(transactions.parentTransactionId, targetId));
           for(const ld of linkedDests) {
             await tx.delete(transactions).where(eq(transactions.id, ld.id));
           }
        }

        for (const targetId of idsToDelete) {
          await tx.delete(transactions).where(eq(transactions.id, targetId));
        }
`;
content = content.substring(0, deleteTxStart) + deleteTxReplacement + content.substring(deleteTxEnd);

fs.writeFileSync('src/app/actions/transactions.ts', content);
