import { getTechnicalOverview } from "@/app/actions/backup";
import { getSettings } from "@/app/actions/settings";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configurações | Minhas Finanças",
};

export default async function SettingsPage() {
  const [settings, technicalOverview] = await Promise.all([
    getSettings(),
    getTechnicalOverview(),
  ]);

  return (
    <div className="container mx-auto max-w-5xl px-0 py-4 md:p-8">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Ajustes</h1>
      <p className="mb-6 text-muted-foreground">
        Personalize sua experiência no aplicativo, consulte os dados técnicos e exporte backups locais.
      </p>

      <SettingsClient
        initialClosingDay={settings.closingDay}
        initialTechnicalOverview={technicalOverview}
      />
    </div>
  );
}
