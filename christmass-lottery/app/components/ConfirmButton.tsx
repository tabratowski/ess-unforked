"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import type { FormState } from "@/lib/types";

export default function ConfirmButton({
  label,
  confirm,
  action,
  variant = "danger",
}: {
  label: string;
  confirm: string;
  action: () => Promise<FormState>;
  variant?: "danger" | "primary";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const color = variant === "danger" ? "error" : "primary";

  function run() {
    setOpen(false);
    startTransition(async () => setError((await action()).error));
  }

  return (
    <Stack spacing={0.5} sx={{ alignItems: "flex-end" }}>
      <Button
        size="small"
        color={color}
        variant={variant === "danger" ? "outlined" : "contained"}
        loading={pending}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogContent>
          <DialogContentText>{confirm}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Anuluj</Button>
          <Button color={color} variant="contained" onClick={run}>
            {label}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
