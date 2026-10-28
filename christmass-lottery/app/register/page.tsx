import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import ActionForm, { Field } from "@/app/components/ActionForm";
import AuthCard from "@/app/components/AuthCard";
import NavLink from "@/app/components/NavLink";
import { getSession } from "@/lib/session";

export default async function RegisterPage() {
  if (await getSession()) redirect("/groups");
  return (
    <AuthCard title="Rejestracja">
      <ActionForm action={registerAction} submitLabel="Załóż konto">
        <Field label="Login" name="login" rule="login" maxLength={30} autoComplete="username" />
        <Field label="E-mail" name="email" type="email" rule="email" autoComplete="email" />
        <Field label="Hasło" name="password" type="password" rule="password" autoComplete="new-password" />
      </ActionForm>
      <Typography variant="body2" sx={{ mt: 3 }}>
        Masz już konto? <NavLink href="/login">Zaloguj się</NavLink>
      </Typography>
    </AuthCard>
  );
}
