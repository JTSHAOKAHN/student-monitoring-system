import { NextRequest } from 'next/server';
import { resend } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!resend) {
      return Response.json({ error: 'Resend is not configured yet' }, { status: 503 });
    }

    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [to],
      subject,
      html,
    });

    return Response.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
