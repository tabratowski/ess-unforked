import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import ActionForm, { Field } from "@/app/components/ActionForm";
import AuthCard from "@/app/components/AuthCard";
import NavLink from "@/app/components/NavLink";
import { getSession } from "@/lib/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  if (await getSession()) redirect("/groups");
  const { reset } = await searchParams;
  return (
    <AuthCard title="Logowanie">
      {reset && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Hasło zostało zmienione. Możesz się zalogować.
        </Alert>
      )}
      <ActionForm action={loginAction} submitLabel="Zaloguj się">
        <Field label="Login lub e-mail" name="login" rule="required" autoComplete="username" />
        <Field label="Hasło" name="password" type="password" rule="required" autoComplete="current-password" />
      </ActionForm>
      <Stack direction="row" sx={{ mt: 3, justifyContent: "space-between" }}>
        <NavLink href="/register" variant="body2">
          Zarejestruj się
        </NavLink>
        <NavLink href="/forgot-password" variant="body2">
          Nie pamiętasz hasła?
        </NavLink>
      </Stack>
    </AuthCard>
  );
}
