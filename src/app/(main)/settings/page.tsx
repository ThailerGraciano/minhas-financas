import { getSettings } from "@/app/actions/settings";
import { SettingsForm } from "./settings-form";

export const metadata = {
  title: "Configurações | Minhas Finanças",
};

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="container mx-auto px-0 py-4 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Ajustes</h1>
      <p className="text-muted-foreground mb-6">Personalize sua experiência no aplicativo.</p>

      <SettingsForm initialClosingDay={settings.closingDay} />
    </div>
  );
}
