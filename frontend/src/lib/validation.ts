export function validateExamPayload(payload: unknown): { ok: true; data: { title: string; description: string } } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid request body.' };
  }

  const body = payload as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (!title || title.length < 3) {
    return { ok: false, error: 'Title must be at least 3 characters long.' };
  }

  if (title.length > 120) {
    return { ok: false, error: 'Title must be 120 characters or fewer.' };
  }

  if (!description || description.length < 10) {
    return { ok: false, error: 'Description must be at least 10 characters long.' };
  }

  if (description.length > 2000) {
    return { ok: false, error: 'Description must be 2000 characters or fewer.' };
  }

  return { ok: true, data: { title, description } };
}

export function validateEmailPayload(payload: unknown): { ok: true; data: { to: string; subject: string; html: string } } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid request body.' };
  }

  const body = payload as Record<string, unknown>;
  const to = typeof body.to === 'string' ? body.to.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const html = typeof body.html === 'string' ? body.html.trim() : '';

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: 'A valid recipient email is required.' };
  }

  if (!subject || subject.length < 3) {
    return { ok: false, error: 'Subject must be at least 3 characters long.' };
  }

  if (!html || html.length < 10) {
    return { ok: false, error: 'HTML content must be at least 10 characters long.' };
  }

  return { ok: true, data: { to, subject, html } };
}
