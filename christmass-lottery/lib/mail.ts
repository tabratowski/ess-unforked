import "server-only";
import nodemailer from "nodemailer";

const DEFAULT_FROM = "tomasz.abratowski@gmail.com";

// Gmail SMTP with an app password (myaccount.google.com/apppasswords).
export async function sendMail(m: { to: string; subject: string; text: string }): Promise<void> {
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) throw new Error("GMAIL_APP_PASSWORD is not set");
  const from = process.env.MAIL_FROM || DEFAULT_FROM;
  const transport = nodemailer.createTransport({ service: "gmail", auth: { user: from, pass } });
  await transport.sendMail({ from, ...m });
}
