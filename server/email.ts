import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = "Memory Garden <no-reply@memory-garden.ai>";
const appUrl = process.env.APP_URL || "https://www.memory-garden.ai";

// Simple email queue to respect Resend's 2 req/sec rate limit
const emailQueue: Array<{ to: string; subject: string; html: string }> = [];
let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;
  while (emailQueue.length > 0) {
    const { to, subject, html } = emailQueue.shift()!;
    try {
      console.log(`[Email] Sending to "${to}": ${subject}`);
      const result = await resend!.emails.send({ from: fromEmail, to, subject, html });
      console.log(`[Email] Sent to ${to}:`, result?.data?.id || result);
    } catch (error: any) {
      console.error(`[Email] Failed to send to ${to}:`, error?.message || error);
    }
    // Wait 600ms between sends (stays under 2/sec limit)
    if (emailQueue.length > 0) {
      await new Promise(r => setTimeout(r, 600));
    }
  }
  processing = false;
}

function queueEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[Email] No RESEND_API_KEY — skipping email to ${to}: ${subject}`);
    return;
  }
  emailQueue.push({ to, subject, html });
  processQueue();
}

// When a teacher adds a child and the parent isn't on the app yet
export function sendParentInviteEmail(parentEmail: string, childName: string, teacherName: string) {
  const subject = `${childName}'s moments are being captured on Memory Garden`;
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
  queueEmail(parentEmail, subject, html);
}

// When a teacher adds a child and the parent already has an account
export function sendChildLinkedEmail(parentEmail: string, childName: string, teacherName: string) {
  const subject = `${teacherName} is now capturing ${childName}'s moments`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2d5016;">Memory Garden</h2>
      <p>Hi there,</p>
      <p><strong>${teacherName}</strong> just connected to <strong>${childName}</strong>'s garden and can now capture moments from their time together.</p>
      <p>You'll start seeing moments from ${teacherName} in ${childName}'s garden as they happen:</p>
      <p><a href="${appUrl}" style="display: inline-block; background: #2d5016; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Open ${childName}'s Garden</a></p>
    </div>
  `;
  queueEmail(parentEmail, subject, html);
}

// When a parent invites the other parent (co-parent) to join
export function sendCoParentInviteEmail(coParentEmail: string, childName: string, inviterName: string) {
  const subject = `${inviterName} wants you to see ${childName}'s moments`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2d5016;">Memory Garden</h2>
      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has been collecting precious moments from <strong>${childName}</strong>'s life — from school, activities, and home — and wants you to be part of it too.</p>
      <p>Memory Garden is the one place where teachers, coaches, and family all capture the moments you'd otherwise miss. Join to see ${childName}'s story as it unfolds:</p>
      <p><a href="${appUrl}" style="display: inline-block; background: #2d5016; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Join ${childName}'s Garden</a></p>
      <p style="color: #666; font-size: 14px;">Sign up with this email (${coParentEmail}) and you'll be connected to ${childName}'s garden automatically.</p>
    </div>
  `;
  queueEmail(coParentEmail, subject, html);
}
