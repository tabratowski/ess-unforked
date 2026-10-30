import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
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
import { Fragment } from "react";
import { logoutAction } from "@/app/actions/auth";
import NavLink from "@/app/components/NavLink";
import { isOwner } from "@/lib/owner";
import { getSession } from "@/lib/session";
import type { Group } from "@/lib/types";
import { listGroups } from "@/lib/wp";
import CreateGroupForm from "./CreateGroupForm";
import DrawButton from "./DrawButton";
import JoinButton from "./JoinButton";

function GroupAction({ group }: { group: Group }) {
  if (group.status === "drawn") {
    return group.isMember ? <DrawButton groupId={group.id} receiverLogin={group.receiverLogin} /> : null;
  }
  if (group.isMember) {
    return (
      <Typography variant="body2" color="text.secondary">
        Czekamy jeszcze na {group.capacity - group.memberCount}
      </Typography>
    );
  }
  return <JoinButton groupId={group.id} />;
}

export default async function GroupsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  let groups: Group[] = [];
  let loadError = false;
  try {
    groups = await listGroups(session.id);
  } catch (e) {
    console.error("listGroups", e);
    loadError = true;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h5" component="h1" color="primary" sx={{ fontWeight: 700 }}>
          🎄 Świąteczne losowanie
        </Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Typography variant="body2">Cześć, {session.login}</Typography>
          {isOwner(session.email) && (
            <NavLink href="/groups/manage" variant="body2">
              Zarządzaj grupami
            </NavLink>
          )}
          <form action={logoutAction}>
            <Button type="submit" size="small">
              Wyloguj
            </Button>
          </form>
        </Stack>
      </Stack>

      {isOwner(session.email) && <CreateGroupForm />}

      <Card elevation={2}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Grupy
          </Typography>
          {loadError && <Alert severity="error">Nie udało się wczytać grup. Odśwież stronę.</Alert>}
          {!loadError && groups.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Brak grup.
            </Typography>
          )}
          <List disablePadding>
            {groups.map((g, i) => (
              <Fragment key={g.id}>
                {i > 0 && <Divider component="li" />}
                <ListItem disableGutters sx={{ gap: 2, flexWrap: "wrap", justifyContent: "space-between" }}>
                  <ListItemText
                    primary={g.name}
                    secondary={
                      <Stack component="span" direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
                        <span>
                          {g.memberCount}/{g.capacity} osób
                        </span>
                        {g.status === "drawn" && g.drawnAt ? (
                          <Chip
                            component="span"
                            size="small"
                            color="secondary"
                            label={`wylosowano ${new Date(g.drawnAt).toLocaleDateString("pl-PL")}`}
                          />
                        ) : (
                          <Chip component="span" size="small" variant="outlined" label="otwarta" />
                        )}
                      </Stack>
                    }
                    slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                    sx={{ flex: "1 1 220px" }}
                  />
                  <GroupAction group={g} />
                </ListItem>
              </Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
}
