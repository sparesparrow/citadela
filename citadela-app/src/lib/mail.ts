import "server-only";

/**
 * Odesílání e-mailů přes Resend, bez SDK — jedno REST volání stačí a
 * projekt tím nezískává další závislost.
 *
 * Dvě pravidla, na kterých to celé stojí:
 *
 * 1. **Nesmí to nikdy vyhodit výjimku.** Poptávka je v databázi dřív, než se
 *    e-mail odesílá; kdyby výpadek Resendu shodil požadavek, host by dostal
 *    chybu na něco, co už se uložilo, a poslal by poptávku podruhé.
 * 2. **Bez klíče se jen loguje.** Vývoj a CI běží bez RESEND_API_KEY a nemají
 *    kvůli tomu tiše selhávat.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface MailMessage {
  to: string;
  subject: string;
  /** Prostý text; HTML verzi zatím nepotřebujeme a hůř se čte v mobilu. */
  text: string;
  replyTo?: string;
}

export type MailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "rejected" | "unreachable" };

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  if (!isMailConfigured()) {
    console.info(`[mail] neodeslano (chybi RESEND_API_KEY/MAIL_FROM): ${message.subject}`);
    return { ok: false, reason: "not_configured" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      console.error(`[mail] Resend odmitl (${response.status}): ${message.subject}`);
      return { ok: false, reason: "rejected" };
    }

    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: body.id ?? "" };
  } catch (error) {
    console.error("[mail] Resend nedosazitelny", error);
    return { ok: false, reason: "unreachable" };
  }
}
