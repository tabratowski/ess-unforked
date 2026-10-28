import Typography from "@mui/material/Typography";
import { forgotPasswordAction } from "@/app/actions/auth";
import ActionForm, { Field } from "@/app/components/ActionForm";
import AuthCard from "@/app/components/AuthCard";
import NavLink from "@/app/components/NavLink";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset hasła">
      <ActionForm action={forgotPasswordAction} submitLabel="Wyślij link">
        <Field label="E-mail" name="email" type="email" rule="email" autoComplete="email" />
      </ActionForm>
      <Typography variant="body2" sx={{ mt: 3 }}>
        <NavLink href="/login">Wróć do logowania</NavLink>
      </Typography>
    </AuthCard>
  );
}
