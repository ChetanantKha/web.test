"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSkillLevel, clearSkillCheck } from "@/lib/skillActions";
import { SKILL_TRICKS, SKILL_CATEGORY_LABEL, LEVEL_LABEL, isDay1Complete, type SkillCategory, type SkillLevel } from "@/lib/skillTricks";
import ErrorAlert from "@/components/ErrorAlert";

const CATEGORY_ORDER: SkillCategory[] = ["day1", "forward", "backward", "turning", "breaking", "other"];
const LEVELS: SkillLevel[] = [1, 2, 3];

type Rating = { level: SkillLevel; notes: string };

function TrickRow({
  studentId,
  trickKey,
  label,
  description,
  locked,
  rating,
  onChange,
}: {
  studentId: string;
  trickKey: string;
  label: string;
  description: string;
  locked: boolean;
  rating: Rating | null;
  onChange: (next: Rating | null) => void;
}) {
  const [notesDraft, setNotesDraft] = useState(rating?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function pickLevel(level: SkillLevel) {
    setError(null);
    const prev = rating;
    const next = { level, notes: notesDraft };
    onChange(next);
    startTransition(async () => {
      const result = await setSkillLevel(studentId, trickKey, level, notesDraft);
      if (result?.error) {
        setError(result.error);
        onChange(prev);
        return;
      }
      router.refresh();
    });
  }

  function saveNotes() {
    if (!rating) return; // notes only save once a level exists
    setError(null);
    const level = rating.level;
    onChange({ level, notes: notesDraft });
    startTransition(async () => {
      const result = await setSkillLevel(studentId, trickKey, level, notesDraft);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function clear() {
    setError(null);
    const prev = rating;
    onChange(null);
    setNotesDraft("");
    startTransition(async () => {
      const result = await clearSkillCheck(studentId, trickKey);
      if (result?.error) {
        setError(result.error);
        onChange(prev);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={`rounded-lg p-2 text-sm ${locked ? "opacity-40" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <span>
          <span className="font-medium">{label}</span>
          <span className="block text-xs text-gray-500">{description}</span>
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {LEVELS.map((lvl) => (
          <button
            key={lvl}
            type="button"
            disabled={locked || pending}
            onClick={() => pickLevel(lvl)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              rating?.level === lvl
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-gray-300 bg-white text-gray-600 hover:border-orange-300"
            }`}
          >
            {lvl}. {LEVEL_LABEL[lvl]}
          </button>
        ))}
        {rating && (
          <button type="button" disabled={locked || pending} onClick={clear} className="px-1 text-xs text-gray-400 hover:text-red-500">
            ล้างค่า
          </button>
        )}
      </div>
      {rating && !locked && (
        <input
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={saveNotes}
          placeholder="หมายเหตุจากผู้สอน (ถ้ามี)"
          className="mt-1.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs"
        />
      )}
      {error && <div className="mt-1">{<ErrorAlert message={error} />}</div>}
    </div>
  );
}

export default function StudentSkillChecklist({
  studentId,
  initialRatings,
}: {
  studentId: string;
  initialRatings: [string, Rating][];
}) {
  const [ratings, setRatings] = useState<Map<string, Rating>>(new Map(initialRatings));

  const levelsOnly = new Map<string, SkillLevel>([...ratings].map(([key, r]) => [key, r.level]));
  const day1Done = isDay1Complete(levelsOnly);

  function updateRating(key: string, next: Rating | null) {
    setRatings((prev) => {
      const copy = new Map(prev);
      if (next) copy.set(key, next);
      else copy.delete(key);
      return copy;
    });
  }

  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((category) => {
        const tricks = SKILL_TRICKS.filter((t) => t.category === category);
        const locked = category !== "day1" && !day1Done;

        return (
          <div key={category} className="rounded-xl border border-gray-200 bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold text-blue-950">
              {SKILL_CATEGORY_LABEL[category]}
              {locked && <span className="ml-2 text-xs font-normal text-gray-400">(ต้องผ่าน Day 1 ก่อน)</span>}
            </h3>
            <div className="divide-y divide-gray-100">
              {tricks.map((trick) => (
                <TrickRow
                  key={trick.key}
                  studentId={studentId}
                  trickKey={trick.key}
                  label={trick.label}
                  description={trick.description}
                  locked={locked}
                  rating={ratings.get(trick.key) ?? null}
                  onChange={(next) => updateRating(trick.key, next)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
