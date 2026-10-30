"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { drawAction } from "@/app/actions/groups";

export default function DrawButton({ groupId, receiverLogin }: { groupId: number; receiverLogin: string | null }) {
  const [receiver, setReceiver] = useState(receiverLogin);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [drawing, startDraw] = useTransition();
  const [resending, startResend] = useTransition();

  function draw() {
    startDraw(async () => {
      const r = await drawAction(groupId);
      if (r.receiverLogin) setReceiver(r.receiverLogin);
      setError(r.error);
      setNotice(r.error ? undefined : "Wysłaliśmy wynik na Twój e-mail.");
    });
  }

  function resend() {
    setNotice(undefined);
    startResend(async () => {
      const r = await drawAction(groupId);
      setError(r.error);
      setNotice(r.error ? undefined : "Wysłano ponownie.");
    });
  }

  return (
    <Stack spacing={0.5} sx={{ alignItems: "flex-end", textAlign: "right" }}>
      {receiver && (
        <Typography>
          🎁 Kupujesz prezent dla <strong>{receiver}</strong>
        </Typography>
      )}
      <Stack direction="row" spacing={1}>
        <Button variant="contained" size="small" loading={drawing} disabled={!!receiver} onClick={draw}>
          Losuj
        </Button>
        {receiver && (
          <Button variant="outlined" size="small" loading={resending} onClick={resend}>
            Wyślij ponownie mail
          </Button>
        )}
      </Stack>
      {notice && (
        <Typography variant="caption" color="text.secondary">
          {notice}
        </Typography>
      )}
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
