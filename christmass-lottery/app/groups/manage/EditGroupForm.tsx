"use client";

import { updateGroupAction } from "@/app/actions/manage";
import ActionForm, { Field } from "@/app/components/ActionForm";
import type { Group } from "@/lib/types";

export default function EditGroupForm({ group }: { group: Group }) {
  const drawn = group.status === "drawn";
  return (
    <ActionForm action={updateGroupAction} submitLabel="Zapisz">
      <input type="hidden" name="groupId" value={group.id} />
      <Field label="Nazwa" name="name" rule="required" maxLength={100} defaultValue={group.name} />
      {drawn ? (
        <input type="hidden" name="capacity" value={group.capacity} />
      ) : (
        <Field
          label={`Liczba osób (parzysta, co najmniej ${Math.max(2, group.memberCount + (group.memberCount % 2))})`}
          name="capacity"
          type="number"
          rule="capacity"
          min={2}
          max={100}
          step={2}
          defaultValue={String(group.capacity)}
        />
      )}
    </ActionForm>
  );
}
