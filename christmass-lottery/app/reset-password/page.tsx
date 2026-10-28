import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { resetPasswordAction } from "@/app/actions/auth";
import ActionForm, { Field } from "@/app/components/ActionForm";
import AuthCard from "@/app/components/AuthCard";
import NavLink from "@/app/components/NavLink";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string; key?: string }>;
}) {
  const { login, key } = await searchParams;
  if (!login || !key) {
    return (
      <AuthCard title="Ustaw nowe hasło">
        <Alert severity="error">Ten link jest nieprawidłowy lub wygasł.</Alert>
        <Typography variant="body2" sx={{ mt: 3 }}>
          <NavLink href="/forgot-password">Poproś o nowy link</NavLink>
        </Typography>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={`Nowe hasło dla ${login}`}>
      <ActionForm action={resetPasswordAction} submitLabel="Zapisz hasło">
        <input type="hidden" name="login" value={login} />
        <input type="hidden" name="key" value={key} />
        <Field label="Nowe hasło" name="password" type="password" rule="password" autoComplete="new-password" />
      </ActionForm>
    </AuthCard>
  );
}
