"use client";

import React from "react";
import { FloatingDock, FloatingDockItem } from "@/components/ui/floating-dock";
import {
  Home,
  Terminal,
  Layers,
  Sparkles,
  GraduationCap,
  BookOpen,
  Globe,
} from "lucide-react";

export default function FloatingDockDemo() {
  const links: FloatingDockItem[] = [
    {
      title: "Home",
      icon: <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/",
    },
    {
      title: "AI Chat",
      icon: <Terminal className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/chat",
    },
    {
      title: "Timetable",
      icon: <Layers className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/timetable",
    },
    {
      title: "Study Together",
      icon: <Sparkles className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/study-together",
    },
    {
      title: "Exams",
      icon: <GraduationCap className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/exams",
    },
    {
      title: "Materials",
      icon: <BookOpen className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/materials",
    },
    {
      title: "Community",
      icon: <Globe className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "#",
    },
  ];

  return (
    <div className="flex items-center justify-center h-[35rem] w-full">
      <FloatingDock
        mobileClassName="translate-y-20"
        items={links}
      />
    </div>
  );
}
