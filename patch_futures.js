const fs = require('fs');
const file = 'src/app/actions/transactions.ts';
let content = fs.readFileSync(file, 'utf8');

const targetToReplace = `        const futuresToUpdate = allRelated.filter((t) => !updatedIds.includes(t.id));

        for (const targetTx of futuresToUpdate) {
          await applyBalanceDelta(
            tx,
            targetTx.accountId,
            targetTx.amount,
            targetTx.type,
            targetTx.status || "pending",
            targetTx.parentTransactionId,
            true,
          );

          const [updatedTx] = await tx
            .update(transactions)
            .set({
              amount: data.amount !== undefined ? data.amount : targetTx.amount,
            })
            .where(eq(transactions.id, targetTx.id))
            .returning();

          await applyBalanceDelta(
            tx,
            updatedTx.accountId,
            updatedTx.amount,
            updatedTx.type,
            updatedTx.status || "pending",
            updatedTx.parentTransactionId,
            false,
          );
        }

        if (oldTx.fixedTransactionId && data.amount !== undefined) {
          await tx
            .update(fixedTransactions)
            .set({
              amount: data.amount,
            })
            .where(eq(fixedTransactions.id, oldTx.fixedTransactionId));
        }`;

const replacement = `        const futuresToUpdate = allRelated.filter((t) => !updatedIds.includes(t.id));

        const userCards = await tx.select().from(creditCards).where(eq(creditCards.userId, userId));
        const cardMap = new Map(userCards.map((c) => [c.id, c]));

        for (const targetTx of futuresToUpdate) {
          await applyBalanceDelta(
            tx,
            targetTx.accountId,
            targetTx.amount,
            targetTx.type,
            targetTx.status || "pending",
            targetTx.parentTransactionId,
            true,
          );

          const isDestination = targetTx.type === "transfer" && targetTx.parentTransactionId !== null;
          
          let newAccountId = targetTx.accountId;
          let newCreditCardId = targetTx.creditCardId;
          let newType = targetTx.type;

          if (data.type !== undefined && targetTx.type !== "transfer") {
             newType = data.type;
             newAccountId = data.accountId !== undefined ? data.accountId : null;
             newCreditCardId = data.creditCardId !== undefined ? data.creditCardId : null;
          } else if (targetTx.type === "transfer") {
             if (isDestination && destinationAccountId !== undefined) {
               newAccountId = destinationAccountId;
             } else if (!isDestination && data.accountId !== undefined) {
               newAccountId = data.accountId;
             }
          }

          let newInvoiceMonth = targetTx.invoiceMonth;
          let newCompetencyMonth = targetTx.competencyMonth;
          
          if (newType === "credit_card_expense" && newCreditCardId) {
             const card = cardMap.get(newCreditCardId);
             if (card) {
                newCompetencyMonth = getCompetencyMonth(parseISO(targetTx.date), card.closingDay);
                newInvoiceMonth = newCompetencyMonth;
             }
          } else if (newType === "expense" || newType === "income" || newType === "transfer") {
             newInvoiceMonth = null;
             newCompetencyMonth = getCompetencyMonth(parseISO(targetTx.date), closingDay);
          }

          let newDescription = targetTx.description;
          if (data.description !== undefined) {
             const baseDesc = data.description.replace(/\\s*\\(Saída\\)|\\s*\\(Entrada\\)/g, "");
             if (targetTx.type === "transfer") {
                newDescription = isDestination ? \`\${baseDesc} (Entrada)\` : \`\${baseDesc} (Saída)\`;
             } else {
                newDescription = baseDesc;
             }
          }

          const [updatedTx] = await tx
            .update(transactions)
            .set({
              amount: data.amount !== undefined ? data.amount : targetTx.amount,
              description: newDescription,
              categoryId: data.categoryId !== undefined ? data.categoryId : targetTx.categoryId,
              subcategoryId: data.subcategoryId !== undefined ? data.subcategoryId : targetTx.subcategoryId,
              accountId: newAccountId,
              creditCardId: newCreditCardId,
              type: newType,
              invoiceMonth: newInvoiceMonth,
              competencyMonth: newCompetencyMonth,
            })
            .where(eq(transactions.id, targetTx.id))
            .returning();

          await applyBalanceDelta(
            tx,
            updatedTx.accountId,
            updatedTx.amount,
            updatedTx.type,
            updatedTx.status || "pending",
            updatedTx.parentTransactionId,
            false,
          );
        }

        if (oldTx.fixedTransactionId) {
          const updateFixed: any = {};
          if (data.amount !== undefined) updateFixed.amount = data.amount;
          if (data.description !== undefined) updateFixed.description = data.description.replace(/\\s*\\(Saída\\)|\\s*\\(Entrada\\)/g, "");
          if (data.categoryId !== undefined) updateFixed.categoryId = data.categoryId;
          if (data.subcategoryId !== undefined) updateFixed.subcategoryId = data.subcategoryId;
          if (data.accountId !== undefined) updateFixed.accountId = data.accountId;
          if (data.creditCardId !== undefined) updateFixed.creditCardId = data.creditCardId;
          if (data.type !== undefined && data.type !== "transfer") updateFixed.type = data.type;
          if (destinationAccountId !== undefined) updateFixed.destinationAccountId = destinationAccountId;
          
          if (Object.keys(updateFixed).length > 0) {
            await tx
              .update(fixedTransactions)
              .set(updateFixed)
              .where(eq(fixedTransactions.id, oldTx.fixedTransactionId));
          }
        }`;

if (content.includes('amount: data.amount !== undefined ? data.amount : targetTx.amount,')) {
    content = content.replace(targetToReplace, replacement);
    fs.writeFileSync(file, content);
    console.log("Patched successfully!");
} else {
    console.log("Could not find target to replace.");
}
