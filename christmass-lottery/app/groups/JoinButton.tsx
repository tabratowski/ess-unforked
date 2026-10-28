"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { joinGroupAction } from "@/app/actions/groups";

export default function JoinButton({ groupId }: { groupId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <Stack spacing={0.5} sx={{ alignItems: "flex-end" }}>
      <Button
        variant="contained"
        color="secondary"
        size="small"
        loading={pending}
        onClick={() => startTransition(async () => setError((await joinGroupAction(groupId)).error))}
      >
        Dołącz
      </Button>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
