import { cleanTransferDescription, groupPairedTransfers, TransferPairable } from "@/lib/transfer-utils";
import { describe, expect, it } from "vitest";

describe("Transfer Utils", () => {
  it("remove sufixos (Saída) e (Entrada) preservando parcelas", () => {
    expect(cleanTransferDescription("Reserva Mensal (Saída)")).toBe("Reserva Mensal");
    expect(cleanTransferDescription("Reserva Mensal (Entrada)")).toBe("Reserva Mensal");
    expect(cleanTransferDescription("Reserva (1/3) (Saída)")).toBe("Reserva (1/3)");
  });

  it("agrupa transferência pareada (Entrada antes de Saída) em um único item com origem e destino", () => {
    const txs: TransferPairable[] = [
      {
        id: 2,
        type: "transfer",
        description: "Reserva Mensal (Entrada)",
        status: "paid",
        parentTransactionId: 1,
        account: { id: 20, name: "Reserva" },
      },
      {
        id: 1,
        type: "transfer",
        description: "Reserva Mensal (Saída)",
        status: "paid",
        parentTransactionId: null,
        account: { id: 10, name: "Nubank" },
      },
    ];

    const grouped = groupPairedTransfers(txs);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      id: 1,
      description: "Reserva Mensal",
      status: "paid",
      isTransferGroup: true,
      originAccount: { id: 10, name: "Nubank" },
      destinationAccount: { id: 20, name: "Reserva" },
    });
  });

  it("agrupa transferências virtuais negativas mantendo origem e destino", () => {
    const txs: TransferPairable[] = [
      {
        id: -500,
        type: "transfer",
        description: "Aporte Fixo (Saída)",
        status: "pending",
        parentTransactionId: null,
        account: { id: 10, name: "Itaú" },
      },
      {
        id: -501,
        type: "transfer",
        description: "Aporte Fixo (Entrada)",
        status: "pending",
        parentTransactionId: -500,
        account: { id: 30, name: "Corretora" },
      },
    ];

    const grouped = groupPairedTransfers(txs);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].id).toBe(-500);
    expect(grouped[0].isTransferGroup).toBe(true);
    expect(grouped[0].originAccount?.name).toBe("Itaú");
    expect(grouped[0].destinationAccount?.name).toBe("Corretora");
  });

  it("mantém transferência sem par intacta (ex.: quando filtrado por conta)", () => {
    const txs: TransferPairable[] = [
      {
        id: 2,
        type: "transfer",
        description: "Reserva Mensal (Entrada)",
        status: "paid",
        parentTransactionId: 1,
        account: { id: 20, name: "Reserva" },
      },
      {
        id: 3,
        type: "expense",
        description: "Mercado",
        status: "paid",
        parentTransactionId: null,
        account: { id: 20, name: "Reserva" },
      },
    ];

    const grouped = groupPairedTransfers(txs);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].isTransferGroup).toBeUndefined();
    expect(grouped[0].description).toBe("Reserva Mensal (Entrada)");
  });
});
