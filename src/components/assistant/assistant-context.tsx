"use client";

import { askFinancialAssistant, ChatMessage } from "@/app/actions/assistant";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { z } from "zod";

export interface AssistantMessage extends ChatMessage {
  id: string;
  toolsUsed?: string[];
  isError?: boolean;
  createdAt: number;
}

export interface AssistantConversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: AssistantMessage[];
}

interface AssistantContextValue {
  conversations: AssistantConversation[];
  activeConversation: AssistantConversation | null;
  activeConversationId: string | null;
  isLoading: boolean;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  createNewConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  sendMessage: (text: string) => Promise<void>;
}

const STORAGE_KEY_PREFIX = "minhas-financas-assistant-conversations-v1";
const ASSISTANT_STORAGE_EVENT = "mf-assistant-conversations-change";
const MAX_HISTORY_MESSAGES = 20;
const MAX_STORED_CONVERSATIONS = 30;

const assistantMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "model"]),
  text: z.string(),
  toolsUsed: z.array(z.string()).optional(),
  isError: z.boolean().optional(),
  createdAt: z.number(),
});

const assistantConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.number(),
  messages: z.array(assistantMessageSchema),
});

const assistantConversationListSchema = z.array(assistantConversationSchema);

const EMPTY_CONVERSATIONS: AssistantConversation[] = [];

const cacheByKey = new Map<
  string,
  { raw: string | null; parsed: AssistantConversation[] }
>();
const memoryFallbackByKey = new Map<string, AssistantConversation[]>();

function getStorageKey(userId?: string | null): string | null {
  if (!userId) return null;
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function parseStoredConversations(raw: string | null): AssistantConversation[] {
  if (!raw) return EMPTY_CONVERSATIONS;
  try {
    const jsonUnknown: unknown = JSON.parse(raw);
    const result = assistantConversationListSchema.safeParse(jsonUnknown);
    return result.success ? result.data : EMPTY_CONVERSATIONS;
  } catch {
    return EMPTY_CONVERSATIONS;
  }
}

function readConversationsSnapshot(storageKey: string | null): AssistantConversation[] {
  if (!storageKey || typeof window === "undefined") {
    return EMPTY_CONVERSATIONS;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    const cached = cacheByKey.get(storageKey);
    if (cached && cached.raw === raw) {
      return cached.parsed;
    }
    const parsed = parseStoredConversations(raw);
    cacheByKey.set(storageKey, { raw, parsed });
    return parsed;
  } catch {
    return memoryFallbackByKey.get(storageKey) ?? EMPTY_CONVERSATIONS;
  }
}

function writeConversationsSnapshot(
  storageKey: string | null,
  updater: (prev: AssistantConversation[]) => AssistantConversation[],
): AssistantConversation[] {
  if (!storageKey || typeof window === "undefined") {
    return EMPTY_CONVERSATIONS;
  }
  const current = readConversationsSnapshot(storageKey);
  const next = updater(current).slice(0, MAX_STORED_CONVERSATIONS);
  memoryFallbackByKey.set(storageKey, next);

  try {
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(storageKey, serialized);
    cacheByKey.set(storageKey, { raw: serialized, parsed: next });
  } catch {
    cacheByKey.set(storageKey, { raw: null, parsed: next });
  }

  window.dispatchEvent(new Event(ASSISTANT_STORAGE_EVENT));
  return next;
}

function subscribeConversations(
  storageKey: string | null,
  onStoreChange: () => void,
): () => void {
  if (typeof window === "undefined" || !storageKey) {
    return () => {};
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === storageKey) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(ASSISTANT_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ASSISTANT_STORAGE_EVENT, onStoreChange);
  };
}

function getServerSnapshot(): AssistantConversation[] {
  return EMPTY_CONVERSATIONS;
}

function buildValidHistory(messages: AssistantMessage[]): ChatMessage[] {
  const validPairs: ChatMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.isError) continue;

    // Se uma mensagem do usuário foi seguida imediatamente por uma mensagem de erro,
    // não inclui esse turno incompleto no histórico enviado ao modelo.
    const nextMsg = messages[i + 1];
    if (msg.role === "user" && nextMsg?.isError) {
      continue;
    }

    validPairs.push({
      role: msg.role,
      text: msg.text,
    });
  }

  const sliced = validPairs.slice(-MAX_HISTORY_MESSAGES);
  while (sliced.length > 0 && sliced[0].role !== "user") {
    sliced.shift();
  }
  return sliced;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface AssistantProviderProps {
  userId?: string | null;
  children: React.ReactNode;
}

export function AssistantProvider({ userId, children }: AssistantProviderProps) {
  const storageKey = getStorageKey(userId);

  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeConversations(storageKey, onStoreChange),
    [storageKey],
  );

  const getSnapshot = useCallback(
    () => readConversationsSnapshot(storageKey),
    [storageKey],
  );

  const conversations = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeConversation = useMemo(() => {
    if (selectedConversationId) {
      const found = conversations.find((c) => c.id === selectedConversationId);
      if (found) return found;
    }
    return conversations[0] ?? null;
  }, [conversations, selectedConversationId]);

  const activeConversationId = activeConversation?.id ?? null;

  const createNewConversation = useCallback(() => {
    const newConv: AssistantConversation = {
      id: generateId(),
      title: "Nova conversa",
      updatedAt: Date.now(),
      messages: [],
    };
    writeConversationsSnapshot(storageKey, (prev) => [newConv, ...prev]);
    setSelectedConversationId(newConv.id);
  }, [storageKey]);

  const selectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      const next = writeConversationsSnapshot(storageKey, (prev) =>
        prev.filter((c) => c.id !== id),
      );
      if (activeConversationId === id) {
        setSelectedConversationId(next[0]?.id ?? null);
      }
    },
    [activeConversationId, storageKey],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading || !storageKey) return;

      let targetId = activeConversationId;
      let baseHistory: ChatMessage[] = [];

      const currentConversations = readConversationsSnapshot(storageKey);

      if (!targetId) {
        const newId = generateId();
        const newConv: AssistantConversation = {
          id: newId,
          title: trimmed.slice(0, 40) + (trimmed.length > 40 ? "..." : ""),
          updatedAt: Date.now(),
          messages: [],
        };
        writeConversationsSnapshot(storageKey, (prev) => [newConv, ...prev]);
        setSelectedConversationId(newId);
        targetId = newId;
      } else {
        const existing = currentConversations.find((c) => c.id === targetId);
        if (existing) {
          baseHistory = buildValidHistory(existing.messages);
        }
      }

      const userMsg: AssistantMessage = {
        id: generateId(),
        role: "user",
        text: trimmed,
        createdAt: Date.now(),
      };

      writeConversationsSnapshot(storageKey, (prev) =>
        prev.map((c) => {
          if (c.id !== targetId) return c;
          const isFirst = c.messages.length === 0;
          return {
            ...c,
            title: isFirst
              ? trimmed.slice(0, 40) + (trimmed.length > 40 ? "..." : "")
              : c.title,
            updatedAt: Date.now(),
            messages: [...c.messages, userMsg],
          };
        }),
      );

      setIsLoading(true);
      try {
        const res = await askFinancialAssistant(baseHistory, trimmed);

        if (res.success) {
          const modelMsg: AssistantMessage = {
            id: generateId(),
            role: "model",
            text: res.reply,
            toolsUsed: res.toolsUsed,
            createdAt: Date.now(),
          };

          writeConversationsSnapshot(storageKey, (prev) =>
            prev.map((c) =>
              c.id === targetId
                ? {
                    ...c,
                    updatedAt: Date.now(),
                    messages: [...c.messages, modelMsg],
                  }
                : c,
            ),
          );
        } else {
          const errorMsg: AssistantMessage = {
            id: generateId(),
            role: "model",
            text: res.error,
            isError: true,
            createdAt: Date.now(),
          };

          writeConversationsSnapshot(storageKey, (prev) =>
            prev.map((c) =>
              c.id === targetId
                ? {
                    ...c,
                    updatedAt: Date.now(),
                    messages: [...c.messages, errorMsg],
                  }
                : c,
            ),
          );
        }
      } catch (err) {
        const errorText =
          err instanceof Error && err.message
            ? `Erro ao consultar assistente: ${err.message}`
            : "Erro inesperado ao consultar o assistente.";

        const errorMsg: AssistantMessage = {
          id: generateId(),
          role: "model",
          text: errorText,
          isError: true,
          createdAt: Date.now(),
        };

        writeConversationsSnapshot(storageKey, (prev) =>
          prev.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  messages: [...c.messages, errorMsg],
                }
              : c,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeConversationId, isLoading, storageKey],
  );

  return (
    <AssistantContext.Provider
      value={{
        conversations,
        activeConversation,
        activeConversationId,
        isLoading,
        isDrawerOpen,
        setIsDrawerOpen,
        createNewConversation,
        selectConversation,
        deleteConversation,
        sendMessage,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error("useAssistant deve ser usado dentro de AssistantProvider");
  }
  return ctx;
}
