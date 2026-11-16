export interface TransferAccountRef {
  id: number;
  name: string;
}

export interface TransferPairable {
  id: number;
  type: string;
  description: string;
  status: string;
  parentTransactionId: number | null;
  account?: TransferAccountRef | null;
}

export type WithTransferGroup<T extends TransferPairable> = T & {
  isTransferGroup?: boolean;
  originAccount?: TransferAccountRef | null;
  destinationAccount?: TransferAccountRef | null;
};

/**
 * Remove os sufixos "(Saída)" e "(Entrada)" adicionados automaticamente em transferências pareadas.
 */
export function cleanTransferDescription(description: string): string {
  return description.replace(/\s*\((Saída|Entrada)\)/gi, "").trim();
}

/**
 * Agrupa as duas pontas de uma transferência (Saída + Entrada vinculadas por `parentTransactionId`)
 * em um único item visual com conta origem e conta destino.
 * Transferências sem par na lista atual (ex.: filtro por conta específica) permanecem individuais.
 */
export function groupPairedTransfers<T extends TransferPairable>(
  transactions: T[],
): WithTransferGroup<T>[] {
  const transferById = new Map<number, T>();
  for (const tx of transactions) {
    if (tx.type === "transfer") {
      transferById.set(tx.id, tx);
    }
  }

  const destByOriginId = new Map<number, T>();
  for (const tx of transactions) {
    if (
      tx.type === "transfer" &&
      tx.parentTransactionId !== null &&
      transferById.has(tx.parentTransactionId)
    ) {
      destByOriginId.set(tx.parentTransactionId, tx);
    }
  }

  const result: WithTransferGroup<T>[] = [];

  for (const tx of transactions) {
    if (tx.type === "transfer") {
      const dest = destByOriginId.get(tx.id);
      if (dest) {
        result.push({
          ...tx,
          description: cleanTransferDescription(tx.description),
          status: tx.status !== dest.status ? "partial" : tx.status,
          isTransferGroup: true,
          originAccount: tx.account ?? null,
          destinationAccount: dest.account ?? null,
        });
        continue;
      }

      if (tx.parentTransactionId !== null && transferById.has(tx.parentTransactionId)) {
        continue;
      }
    }

    result.push(tx);
  }

  return result;
}
