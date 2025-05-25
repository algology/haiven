"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { ChatGPT } from "@/components/assistant-ui/chatgpt";
import { ConfigPanel } from "@/components/assistant-ui/config-panel";

export default function ChatPage() {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-dvh grid-cols-[280px_1fr_280px] gap-x-4 px-4 py-4 bg-[#212121]">
        <ThreadList />
        <ChatGPT />
        <ConfigPanel />
      </div>
    </AssistantRuntimeProvider>
  );
}
