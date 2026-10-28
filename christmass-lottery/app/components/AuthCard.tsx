import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" align="center" color="primary" sx={{ fontWeight: 700 }}>
        🎄 Świąteczne losowanie
      </Typography>
      <Card elevation={2}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {title}
          </Typography>
          {children}
        </CardContent>
      </Card>
    </Stack>
  );
}
