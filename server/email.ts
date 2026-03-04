import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.EMAIL_FROM || smtpUser || "";
const appUrl = process.env.APP_URL || "http://localhost:5000";

const transporter = smtpUser && smtpPass
  ? nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    })
  : null;

async function sendEmail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[Email] No SMTP credentials — skipping email to ${to}: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: fromEmail, to, subject, html });
    console.log(`[Email] Sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
  }
}

export function sendParentInviteEmail(parentEmail: string, childName: string, teacherName: string) {
  const subject = `${teacherName} is capturing moments for ${childName} on Memory Garden`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2d5016;">Memory Garden</h2>
      <p>Hi there,</p>
      <p><strong>${teacherName}</strong> has started capturing moments for <strong>${childName}</strong> on Memory Garden — the place where every person in your child's life can share the moments you'd otherwise miss.</p>
      <p>Sign up to see what ${childName}'s day really looked like:</p>
      <p><a href="${appUrl}" style="display: inline-block; background: #2d5016; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Join Memory Garden</a></p>
      <p style="color: #666; font-size: 14px;">Use this email (${parentEmail}) when you sign up so your account links automatically.</p>
    </div>
  `;
  sendEmail(parentEmail, subject, html);
}

export function sendChildLinkedEmail(parentEmail: string, childName: string, teacherName: string) {
  const subject = `${teacherName} is now connected to ${childName}'s Memory Garden`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2d5016;">Memory Garden</h2>
      <p>Hi there,</p>
      <p><strong>${teacherName}</strong> is now connected to <strong>${childName}</strong>'s garden and can capture moments from their time together.</p>
      <p>Check your garden to see new moments as they come in:</p>
      <p><a href="${appUrl}" style="display: inline-block; background: #2d5016; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Open Memory Garden</a></p>
    </div>
  `;
  sendEmail(parentEmail, subject, html);
}

export function sendCoParentInviteEmail(coParentEmail: string, childName: string, inviterName: string) {
  const subject = `You've been invited to ${childName}'s Memory Garden`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2d5016;">Memory Garden</h2>
      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has invited you to see <strong>${childName}</strong>'s Memory Garden — a place where every person in ${childName}'s life captures the moments that matter.</p>
      <p><a href="${appUrl}" style="display: inline-block; background: #2d5016; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Join Memory Garden</a></p>
      <p style="color: #666; font-size: 14px;">Sign up with this email (${coParentEmail}) to connect automatically.</p>
    </div>
  `;
  sendEmail(coParentEmail, subject, html);
}
