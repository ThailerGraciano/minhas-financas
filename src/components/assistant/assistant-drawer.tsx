"use client";

import { AssistantChat } from "@/components/assistant/assistant-chat";
import { useAssistant } from "@/components/assistant/assistant-context";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Bot, Maximize2, MessageSquarePlus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AssistantDrawer() {
  const {
    conversations,
    activeConversationId,
    isDrawerOpen,
    setIsDrawerOpen,
    createNewConversation,
    selectConversation,
  } = useAssistant();

  const pathname = usePathname();
  // Na página dedicada /assistant, não exibe o botão flutuante nem o drawer
  if (pathname === "/assistant") {
    return null;
  }

  return (
    <>
      {/* Botão flutuante: canto inferior esquerdo no mobile (oposto ao FAB) e canto inferior direito no desktop */}
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        className="fixed bottom-20 left-4 md:left-auto md:bottom-6 md:right-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-card/90 backdrop-blur-md border border-primary/40 shadow-lg hover:border-primary hover:scale-105 transition-all text-sm font-medium cursor-pointer"
        aria-label="Abrir Assistente Financeiro"
      >
        <Bot className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline">Assistente</span>
      </button>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-md p-0 gap-0 flex flex-col bg-background border-l border-border/60"
        >
          <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border/60 space-y-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <SheetTitle className="font-semibold text-sm">Assistente Gemini</SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              Painel lateral do assistente financeiro pessoal conectado aos seus dados reais.
            </SheetDescription>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={createNewConversation}
                title="Nova conversa"
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </button>
              <Link
                href="/assistant"
                onClick={() => setIsDrawerOpen(false)}
                title="Abrir em tela cheia"
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
              <SheetClose asChild>
                <button
                  type="button"
                  title="Fechar"
                  aria-label="Fechar"
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </SheetClose>
            </div>
          </SheetHeader>

          {/* Seletor rápido de histórico */}
          {conversations.length > 0 && (
            <div className="px-3 py-2 border-b border-border/40 bg-muted/20">
              <select
                value={activeConversationId ?? ""}
                onChange={(e) => selectConversation(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {conversations.map((conv) => (
                  <option key={conv.id} value={conv.id}>
                    {conv.title} ({conv.messages.length} msgs)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chat */}
          <div className="flex-1 min-h-0">
            <AssistantChat compact />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
