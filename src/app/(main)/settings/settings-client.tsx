"use client";

import { Database, SlidersHorizontal } from "lucide-react";
import type { TechnicalOverviewResult } from "@/app/actions/backup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "./settings-form";
import { TechnicalBackupTab } from "./technical-backup-tab";

interface SettingsClientProps {
  initialClosingDay: number;
  initialTechnicalOverview: TechnicalOverviewResult;
}

export function SettingsClient({ initialClosingDay, initialTechnicalOverview }: SettingsClientProps) {
  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList className="h-10">
        <TabsTrigger value="general" className="px-3.5">
          <SlidersHorizontal className="size-4" />
          Geral
        </TabsTrigger>
        <TabsTrigger value="technical" className="px-3.5">
          <Database className="size-4" />
          Dados Técnicos &amp; Backup
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <SettingsForm initialClosingDay={initialClosingDay} />
      </TabsContent>

      <TabsContent value="technical">
        <TechnicalBackupTab initialData={initialTechnicalOverview} />
      </TabsContent>
    </Tabs>
  );
}
