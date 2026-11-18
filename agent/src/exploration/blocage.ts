export function detecterBlocage(html: string, status: number | null = null): string | null {
  if (status === 403 || status === 429) return `ce site bloque les robots (HTTP ${status}).`;
  if (status === 404 || status === 410) return `Page introuvable (HTTP ${status}).`;
  if (status === 401) return "Connexion demandée (HTTP 401).";
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const text = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const short = text.length < 1800;
  const challenge = /verify (?:that )?you are human|checking your browser|just a moment|security verification|attention required|vérifi(?:ez|cation).*humain|vérification de sécurité|un instant|access denied|accès refusé/i;
  const provider = /_Incapsula_Resource|incapsula|imperva|cf-chl-|challenge-platform|hcaptcha|h-captcha|recaptcha|g-recaptcha|cf-turnstile/i.exec(html)?.[0];
  const contactForm = /<textarea\b|<input\b[^>]*(?:type\s*=\s*["']?email|name\s*=\s*["']?(?:email|message))\b/i.test(html);
  if (short && (challenge.test(title) || (!contactForm && text.length < 600 && challenge.test(text)) || /captcha|robot check|verification required/i.test(title) || (provider && /_Incapsula_Resource|incapsula|imperva|cf-chl-|challenge-platform/i.test(provider)))) {
    return `ce site bloque les robots (${provider ?? "page de vérification"}).`;
  }
  if (short && /^(?:\s*)(?:404\b|page (?:not found|introuvable)|not found)/i.test(title || text)) return "Page introuvable (page 404).";
  if (short && /<input\b[^>]*type\s*=\s*["']?password\b/i.test(html) && /log[ -]?in|sign[ -]?in|connexion|connectez-vous/i.test(title || text)) return "Connexion demandée (formulaire de connexion).";
  return null;
}
