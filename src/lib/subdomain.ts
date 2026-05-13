/**
 * Deteta o código da organização a partir do subdomínio da URL.
 * Ex: "decada.wegest.pt" → "decada"
 * Retorna null se não estiver num subdomínio válido.
 */
export function getSubdomainCodigo(): string | null {
  const hostname = window.location.hostname.toLowerCase();

  // Match {codigo}.wegest.pt
  const match = hostname.match(/^([a-z0-9][a-z0-9-]*[a-z0-9]?)\.wegest\.pt$/);
  if (match && match[1] !== 'www') {
    return match[1];
  }

  return null;
}

/** Código do subdomínio atual (calculado uma vez no load) */
export const subdomainCodigo = getSubdomainCodigo();
