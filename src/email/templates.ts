export interface DigestBrandData {
  brandName: string;
  overallScore: number | null;
  previousOverallScore: number | null;
  scores: {
    visibility: number;
    position: number;
    sentiment: number;
    shareOfVoice: number;
  } | null;
}

export function verificationEmailHtml(
  fullName: string,
  verificationUrl: string,
): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#111827;">Verify your email address</h2>
      <p style="color:#4b5563;">Hi ${fullName}, thanks for signing up for Brand Veda.</p>
      <p style="color:#4b5563;">Click the button below to verify your email address. This link expires in 24 hours.</p>
      <div style="margin:32px 0;">
        <a href="${verificationUrl}"
           style="background:#6366f1;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
          Verify email address
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;">
        If you didn't create an account, you can safely ignore this email.
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
        Or copy this link: <a href="${verificationUrl}" style="color:#6366f1;">${verificationUrl}</a>
      </p>
    </div>
  `;
}

export function weeklyDigestHtml(
  userFullName: string,
  brands: DigestBrandData[],
): string {
  const brandRows = brands
    .map((b) => {
      if (!b.scores) return '';
      const delta =
        b.overallScore !== null && b.previousOverallScore !== null
          ? b.overallScore - b.previousOverallScore
          : null;
      const deltaStr =
        delta !== null
          ? delta > 0
            ? `<span style="color:#16a34a">▲ ${delta.toFixed(1)}</span>`
            : delta < 0
              ? `<span style="color:#dc2626">▼ ${Math.abs(delta).toFixed(1)}</span>`
              : `<span style="color:#6b7280">— same</span>`
          : '';

      return `
        <div style="margin-bottom:24px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;">
          <h3 style="margin:0 0 12px;font-size:16px;">${b.brandName}</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 8px;background:#f9fafb;font-weight:600;">Overall</td>
              <td style="padding:4px 8px;background:#f9fafb;">${b.overallScore ?? 'N/A'} / 100 ${deltaStr}</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;">Visibility</td>
              <td style="padding:4px 8px;">${b.scores.visibility} / 100</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;background:#f9fafb;">Position</td>
              <td style="padding:4px 8px;background:#f9fafb;">${b.scores.position} / 100</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;">Sentiment</td>
              <td style="padding:4px 8px;">${b.scores.sentiment} / 100</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;background:#f9fafb;">Share of Voice</td>
              <td style="padding:4px 8px;background:#f9fafb;">${b.scores.shareOfVoice} / 100</td>
            </tr>
          </table>
        </div>
      `;
    })
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#111827;">Your Weekly Brand Visibility Report</h2>
      <p style="color:#4b5563;">Hi ${userFullName}, here's how your brand is performing across AI platforms this week.</p>
      ${brandRows || '<p style="color:#6b7280;">No completed analysis runs found. Run an analysis to see your scores.</p>'}
      <p style="margin-top:24px;font-size:13px;color:#9ca3af;">
        You're receiving this because you're on Brand Veda Starter or Pro plan.
        <a href="#" style="color:#6366f1;">Manage your subscription</a>
      </p>
    </div>
  `;
}

export function trialExpiredHtml(userFullName: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#111827;">Your Brand Veda trial has expired</h2>
      <p style="color:#4b5563;">Hi ${userFullName}, your 7-day free trial has ended.</p>
      <p style="color:#4b5563;">
        You can still view your existing analysis results and dashboard data.
        To run new analyses and track your brand visibility going forward, upgrade to a paid plan.
      </p>
      <div style="margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;">
          <tr style="background:#f9fafb;">
            <th style="padding:12px;text-align:left;">Plan</th>
            <th style="padding:12px;text-align:left;">Price</th>
            <th style="padding:12px;text-align:left;">Runs/month</th>
          </tr>
          <tr>
            <td style="padding:12px;">Starter</td>
            <td style="padding:12px;">$39/mo</td>
            <td style="padding:12px;">4 runs</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:12px;">Pro</td>
            <td style="padding:12px;">$69/mo</td>
            <td style="padding:12px;">12 runs · 3 brands</td>
          </tr>
        </table>
      </div>
      <p style="font-size:13px;color:#9ca3af;">Brand Veda · Track your brand across AI platforms.</p>
    </div>
  `;
}
