import Container from "@mui/material/Container";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import Providers from "./components/Providers";

export const metadata: Metadata = {
  title: "Świąteczne losowanie",
  description: "Wylosuj, komu kupujesz prezent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <Container maxWidth="sm" sx={{ py: 5 }}>
              {children}
            </Container>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
