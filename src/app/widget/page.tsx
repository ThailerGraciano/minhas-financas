import { getWidgetFullData } from "@/app/actions/widget";
import type { Metadata } from "next";
import { Suspense } from "react";
import { WidgetClientPage } from "./widget-client-page";

export const metadata: Metadata = {
  title: "Widget Rápido | Minhas Finanças AI",
  description: "Acesso rápido a transações e gráficos para tela inicial do Android.",
};

export default async function WidgetPage() {
  const initialData = await getWidgetFullData();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0B10]" />}>
      <WidgetClientPage initialData={initialData} />
    </Suspense>
  );
}

