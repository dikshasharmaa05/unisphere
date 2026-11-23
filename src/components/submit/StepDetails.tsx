"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { saveDetailsAction } from "@/lib/submissions/actions";
import { ARTICLE_TYPES, wordCount } from "@/lib/submissions/labels";
import type { ArticleType } from "@/lib/supabase/types";
import { ABSTRACT_MAX_WORDS } from "@/lib/validation/submission";
import type { FieldErrors } from "@/lib/validation/auth";
import { KeywordsInput } from "./KeywordsInput";
import { useSaveStatus } from "./SaveStatus";
import { StepHeading, StepNav } from "./StepNav";

type Values = { title: string; abstract: string; disciplineId: number | null; articleType: ArticleType; keywords: string[] };

export function StepDetails({
  submissionId,
  initial,
  disciplines,
  locked,
}: {
  submissionId: string;
  initial: Values;
  disciplines: { id: number; name: string }[];
  /** Discipline/type can't change during a revision. */
  locked: boolean;
}) {
  const router = useRouter();
  const save = useSaveStatus();
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const dirty = useRef(false);
  const first = useRef(true);

  const persist = async (v: Values) => {
    save.saving();
    const res = await saveDetailsAction({ submissionId, ...v, ...(locked ? { disciplineId: undefined, articleType: undefined } : {}) });
    if (res.ok) {
      dirty.current = false;
      setErrors({});
      save.saved(res.savedAt);
    } else {
      setErrors(res.fields ?? {});
      save.failed(res.error);
    }
    return res.ok;
  };

  // Autosave ~1s after the last change.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    dirty.current = true;
    const t = setTimeout(() => void persist(values), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((s) => ({ ...s, [k]: v }));
  const words = wordCount(values.abstract);

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step={1} title="Article details" />
      <Input label="Title" value={values.title} onChange={(e) => set("title", e.target.value)} maxLength={300} required error={errors.title} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        <Select
          label="Discipline"
          value={values.disciplineId ?? ""}
          onChange={(e) => set("disciplineId", e.target.value ? Number(e.target.value) : null)}
          disabled={locked}
          error={errors.disciplineId}
          hint={locked ? "Fixed after the first submission." : undefined}
        >
          <option value="">Choose a discipline</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select label="Article type" value={values.articleType} onChange={(e) => set("articleType", e.target.value as ArticleType)} disabled={locked}>
          {ARTICLE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Textarea
          label={
            <>
              Abstract <span className="font-medium text-muted">· public, shown to everyone</span>
            </>
          }
          rows={7}
          value={values.abstract}
          onChange={(e) => set("abstract", e.target.value)}
          error={errors.abstract}
        />
        <p className={`mt-1.5 text-right text-xs ${words > ABSTRACT_MAX_WORDS ? "font-bold text-[#9b1c3d]" : "text-muted"}`} aria-live="polite">
          {words} / {ABSTRACT_MAX_WORDS} words
        </p>
      </div>
      <KeywordsInput value={values.keywords} onChange={(k) => set("keywords", k)} error={errors.keywords} />
      <StepNav
        busy={pending}
        onContinue={() =>
          startTransition(async () => {
            const ok = await persist(values);
            if (!ok) return;
            router.push(`/submit/${submissionId}?step=2`);
          })
        }
      />
    </div>
  );
}
