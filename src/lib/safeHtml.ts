// src/lib/safeHtml.ts
/**
 * Sanitizado MUY básico. Para máxima seguridad, integra DOMPurify.
 */
export function veryBasicSanitize(html: string): string {
  if (!html) return ''
  let out = html
  // quita <script> y <style>
  out = out.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  // quita on*="..." y on*='...'
  out = out.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
  // quita javascript: en href/src
  out = out.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ' $1="#"')
  return out
}