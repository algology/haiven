import type { FC } from "react";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import { ArchiveIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="flex flex-col items-stretch gap-1.5 bg-[#171717] p-3 rounded-lg border border-white/10">
      <div className="flex items-center justify-center mb-2 px-1">
        <img
          src="/haiven.svg"
          alt="Haiven"
          className="h-20 w-20 brightness-0 invert"
        />
      </div>
      <ThreadListNew />
      <ThreadListItems />
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  return (
    <ThreadListPrimitive.New asChild>
      <Button
        className="data-[active]:bg-white/15 hover:bg-white/10 flex items-center justify-start gap-2 rounded-lg px-3 py-2.5 text-start text-white border border-white/20 hover:border-white/30 transition-all duration-200 hover:text-white"
        variant="ghost"
        style={{ backgroundColor: "transparent" }}
      >
        <PlusIcon className="w-4 h-4" />
        New Thread
      </Button>
    </ThreadListPrimitive.New>
  );
};

const ThreadListItems: FC = () => {
  return <ThreadListPrimitive.Items components={{ ThreadListItem }} />;
};

const ThreadListItem: FC = () => {
  return (
    <ThreadListItemPrimitive.Root className="data-[active]:bg-white/15 hover:bg-white/8 focus-visible:bg-white/10 focus-visible:ring-white/20 flex items-center gap-2 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 border border-transparent hover:border-white/10">
      <ThreadListItemPrimitive.Trigger className="flex-grow px-3 py-2.5 text-start">
        <ThreadListItemTitle />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemArchive />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemTitle: FC = () => {
  return (
    <p className="text-sm text-white">
      <ThreadListItemPrimitive.Title fallback="New Chat" />
    </p>
  );
};

const ThreadListItemArchive: FC = () => {
  return (
    <ThreadListItemPrimitive.Archive asChild>
      <TooltipIconButton
        className="hover:text-white text-white/70 ml-auto mr-3 size-4 p-0 hover:bg-transparent focus:bg-transparent active:bg-transparent"
        variant="ghost"
        tooltip="Archive thread"
        style={{ backgroundColor: "transparent" }}
      >
        <ArchiveIcon />
      </TooltipIconButton>
    </ThreadListItemPrimitive.Archive>
  );
};
