"use client";

import React from "react";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

export default function PlaceholdersAndVanishInputDemo() {
  const placeholders = [
    "Ask anything about your subjects, exams, or revision plan...",
    "Explain quantum mechanics or calculus step-by-step...",
    "How should I prepare for my upcoming exam in 3 days?",
    "Summarize the key formulas from thermodynamics...",
    "Generate 5 practice multiple-choice questions for biology...",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Demo change handler
  };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <div className="h-[30rem] flex flex-col justify-center items-center px-4">
      <h2 className="mb-8 text-xl font-bold text-center sm:text-4xl text-neutral-900 dark:text-neutral-100">
        Ask StudyPlanner AI Anything
      </h2>
      <PlaceholdersAndVanishInput
        placeholders={placeholders}
        onChange={handleChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
