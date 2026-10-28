"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { createGroupAction } from "@/app/actions/groups";
import ActionForm, { Field } from "@/app/components/ActionForm";

export default function CreateGroupForm() {
  return (
    <Card elevation={2}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Nowa grupa
        </Typography>
        <ActionForm action={createGroupAction} submitLabel="Utwórz grupę">
          <Field label="Nazwa" name="name" rule="required" maxLength={100} />
          <Field label="Liczba osób (parzysta)" name="capacity" type="number" rule="capacity" min={2} max={100} step={2} />
        </ActionForm>
      </CardContent>
    </Card>
  );
}
