"use client";

import { Dock, DockIcon } from "@/components/magicui/dock";
import {
  Binoculars,
  BotMessageSquare,
  Ellipsis,
  House,
  LogIn,
  Salad,
  Terminal,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AuroraText } from "@/components/magicui/aurora-text";
import { WordRotate } from "@/components/magicui/word-rotate";
export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center">
      <div className="w-full min-h-screen flex items-center flex-col justify-center gap-16">
        <div className="items-center flex flex-row  gap-2 md:gap-4 w-full justify-center">
          <AuroraText
            colors={["white", "gray"]}
            className="text-5xl md:text-9xl font-bold"
          >
            Borq
          </AuroraText>
          <WordRotate
            className="text-5xl md:text-9xl font-bold"
            words={["Chat", "Dev", "Health", "Research", "AI"]}
          />
        </div>
      </div>
      <Dock iconDistance={16} className="absolute bottom-8 md:bottom-16">
        <DockIcon>
          <House />
        </DockIcon>
        <Separator orientation="vertical" />
        <DockIcon>
          <BotMessageSquare />
        </DockIcon>
        <DockIcon>
          <Terminal />
        </DockIcon>
        <DockIcon>
          <Salad />
        </DockIcon>
        <DockIcon>
          <Binoculars />
        </DockIcon>
        <DockIcon>
          <Ellipsis />
        </DockIcon>
        <Separator orientation="vertical" />
        <DockIcon>
          <LogIn />
        </DockIcon>
      </Dock>
    </div>
  );
}
