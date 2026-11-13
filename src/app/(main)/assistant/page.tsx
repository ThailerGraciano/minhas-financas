"use client";

import { AssistantChat } from "@/components/assistant/assistant-chat";
import { useAssistant } from "@/components/assistant/assistant-context";
import { Bot, MessageSquare, MessageSquarePlus, Trash2 } from "lucide-react";

export default function AssistantPage() {
  const {
    conversations,
    activeConversationId,
    createNewConversation,
    selectConversation,
    deleteConversation,
  } = useAssistant();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] border border-border/60 rounded-2xl overflow-hidden bg-background/60 backdrop-blur-sm">
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-card/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">Assistente Financeiro</h1>
            <p className="text-[11px] text-muted-foreground">
              Conectado aos seus dados reais via Gemini
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={createNewConversation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Nova conversa
        </button>
      </div>

      {/* Corpo: Sidebar de histórico + Chat */}
      <div className="flex flex-1 min-h-0">
        {/* Lista de conversas (desktop) */}
        <aside className="hidden md:flex w-64 flex-col border-r border-border/60 bg-card/20">
          <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Histórico
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                Nenhuma conversa ainda.
              </p>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary/15 text-foreground border border-primary/30"
                        : "hover:bg-muted/50 text-muted-foreground"
                    }`}
                    onClick={() => selectConversation(conv.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{conv.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
                      aria-label="Excluir conversa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Área do chat */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Seletor mobile */}
          {conversations.length > 0 && (
            <div className="md:hidden px-3 py-2 border-b border-border/40 bg-muted/20">
              <select
                value={activeConversationId ?? ""}
                onChange={(e) => selectConversation(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-lg px-2.5 py-1.5 text-xs"
              >
                {conversations.map((conv) => (
                  <option key={conv.id} value={conv.id}>
                    {conv.title} ({conv.messages.length} msgs)
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1 min-h-0">
            <AssistantChat />
          </div>
        </div>
      </div>
    </div>
  );
}
