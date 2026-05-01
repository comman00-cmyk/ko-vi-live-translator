export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  return list.includes(email)
}
