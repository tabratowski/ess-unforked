"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { plPL } from "@mui/material/locale";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme(
  {
    palette: {
      primary: { main: "#b71c1c" },
      secondary: { main: "#2e7d32" },
      background: { default: "#fdf8f3" },
    },
    shape: { borderRadius: 10 },
  },
  plPL,
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
