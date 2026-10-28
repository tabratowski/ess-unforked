"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { createContext, startTransition, useActionState, useContext, useState } from "react";
import type { FormState } from "@/lib/types";
import { type FieldRule, validateField } from "@/lib/validation";

const SubmittedContext = createContext(false);

export default function ActionForm({
  action,
  submitLabel,
  children,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [submitted, setSubmitted] = useState(false);

  // Submit via onSubmit rather than <form action>: React resets forms after an action, wiping what the user typed.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    const form = e.currentTarget;
    const invalid = Array.from(form.querySelectorAll<HTMLInputElement>("input[data-rule]")).some((el) =>
      validateField(el.dataset.rule as FieldRule, el.value),
    );
    if (invalid) return;
    const fd = new FormData(form);
    startTransition(() => formAction(fd));
  }

  return (
    <Stack component="form" onSubmit={onSubmit} noValidate spacing={2}>
      <SubmittedContext.Provider value={submitted}>{children}</SubmittedContext.Provider>
      {state.error && <Alert severity="error">{state.error}</Alert>}
      {state.message && <Alert severity="success">{state.message}</Alert>}
      <Button type="submit" variant="contained" size="large" loading={pending}>
        {submitLabel}
      </Button>
    </Stack>
  );
}

export function Field({
  label,
  name,
  rule,
  type,
  autoComplete,
  defaultValue,
  maxLength,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  rule?: FieldRule;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
}) {
  const submitted = useContext(SubmittedContext);
  const [value, setValue] = useState(defaultValue ?? "");
  const [touched, setTouched] = useState(false);
  const error = rule && (touched || submitted) ? validateField(rule, value) : undefined;

  return (
    <TextField
      label={label}
      name={name}
      type={type}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => setTouched(true)}
      error={!!error}
      helperText={error}
      fullWidth
      slotProps={{ htmlInput: { "data-rule": rule, maxLength, min, max, step } }}
    />
  );
}
