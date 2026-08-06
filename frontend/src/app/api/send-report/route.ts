import { NextRequest } from 'next/server';
import { resend } from '@/lib/resend';
import { validateEmailPayload } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const validation = validateEmailPayload(body);
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const { to, subject, html } = validation.data;

    if (!resend) {
      return Response.json({ error: 'Resend is not configured yet' }, { status: 503 });
    }

    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
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
