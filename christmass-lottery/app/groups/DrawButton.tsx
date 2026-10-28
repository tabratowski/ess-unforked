"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { drawAction } from "@/app/actions/groups";

export default function DrawButton({ groupId }: { groupId: number }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; receiverLogin?: string }>({});
  return (
    <Stack spacing={0.5} sx={{ alignItems: "flex-end", textAlign: "right" }}>
      {result.receiverLogin ? (
        <>
          <Typography>
            🎁 Kupujesz prezent dla <strong>{result.receiverLogin}</strong>
          </Typography>
          {!result.error && (
            <Typography variant="caption" color="text.secondary">
              Wysłaliśmy to też na Twój e-mail.
            </Typography>
          )}
        </>
      ) : (
        <Button
          variant="contained"
          size="small"
          loading={pending}
          onClick={() => startTransition(async () => setResult(await drawAction(groupId)))}
        >
          Losuj
        </Button>
      )}
      {result.error && (
        <Typography variant="caption" color="error">
          {result.error}
        </Typography>
      )}
    </Stack>
  );
}
