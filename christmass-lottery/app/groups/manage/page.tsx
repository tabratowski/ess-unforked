import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { deleteGroupAction, redrawGroupAction, removeMemberAction } from "@/app/actions/manage";
import ConfirmButton from "@/app/components/ConfirmButton";
import NavLink from "@/app/components/NavLink";
import { isOwner } from "@/lib/owner";
import { getSession } from "@/lib/session";
import type { Group, User } from "@/lib/types";
import { listGroups, listMembers } from "@/lib/wp";
import EditGroupForm from "./EditGroupForm";

function GroupCard({ group, members }: { group: Group; members: User[] }) {
  const drawn = group.status === "drawn";
  return (
    <Card elevation={2}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
            <div>
              <Typography variant="h6" component="h2">
                {group.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {group.memberCount}/{group.capacity} osób
                </Typography>
                {drawn && group.drawnAt ? (
                  <Chip
                    size="small"
                    color="secondary"
                    label={`wylosowano ${new Date(group.drawnAt).toLocaleDateString("pl-PL")}`}
                  />
                ) : (
                  <Chip size="small" variant="outlined" label="otwarta" />
                )}
              </Stack>
            </div>
            <Stack direction="row" spacing={1}>
              {drawn && (
                <ConfirmButton
                  label="Losuj ponownie"
                  variant="primary"
                  confirm={`Rozlosować „${group.name}” od nowa? Każdy dostanie nową osobę. Kto już kliknął „Losuj”, ma stary wynik w e-mailu — poproś, żeby wylosował jeszcze raz.`}
                  action={redrawGroupAction.bind(null, group.id)}
                />
              )}
              <ConfirmButton
                label="Usuń"
                confirm={`Usunąć grupę „${group.name}” razem z losowaniem? Tej operacji nie można cofnąć.`}
                action={deleteGroupAction.bind(null, group.id)}
              />
            </Stack>
          </Stack>

          <EditGroupForm group={group} />

          <div>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
              Uczestnicy
            </Typography>
            {members.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Nikt jeszcze nie dołączył.
              </Typography>
            )}
            <List dense disablePadding>
              {members.map((m, i) => (
                <ListItem
                  key={m.id}
                  disableGutters
                  divider={i < members.length - 1}
                  secondaryAction={
                    !drawn && (
                      <ConfirmButton
                        label="Usuń"
                        confirm={`Usunąć ${m.login} z grupy „${group.name}”?`}
                        action={removeMemberAction.bind(null, group.id, m.id)}
                      />
                    )
                  }
                >
                  <ListItemText primary={m.login} secondary={m.email} />
                </ListItem>
              ))}
            </List>
            {drawn && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Grupa jest już rozlosowana, więc nie można usuwać uczestników. Użyj „Losuj ponownie”.
                </Typography>
              </>
            )}
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default async function ManageGroupsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isOwner(session.email)) redirect("/groups");

  let cards: { group: Group; members: User[] }[] = [];
  let loadError = false;
  try {
    const groups = await listGroups(session.id);
    cards = await Promise.all(groups.map(async (group) => ({ group, members: await listMembers(group.id) })));
  } catch (e) {
    console.error("manage groups", e);
    loadError = true;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" component="h1" color="primary" sx={{ fontWeight: 700 }}>
          Zarządzanie grupami
        </Typography>
        <NavLink href="/groups" variant="body2">
          Wróć do grup
        </NavLink>
      </Stack>
      {loadError && <Alert severity="error">Nie udało się wczytać grup. Odśwież stronę.</Alert>}
      {!loadError && cards.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Brak grup.
        </Typography>
      )}
      {cards.map(({ group, members }) => (
        <GroupCard key={group.id} group={group} members={members} />
      ))}
    </Stack>
  );
}
