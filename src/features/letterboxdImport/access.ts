import type { User } from '@supabase/supabase-js'
import { appConfig } from '../../config/env'

const metadataHasAdminRole = (metadata: User['app_metadata']) => {
  const role = metadata.role
  const roles = metadata.roles

  return (
    role === 'admin' ||
    (Array.isArray(roles) && roles.some((value) => value === 'admin'))
  )
}

export const canUseLetterboxdImport = (user: User | null) => {
  if (!user) {
    return false
  }

  if (import.meta.env.DEV && appConfig.letterboxdImportAdminEmails.length === 0) {
    return true
  }

  const email = user.email?.trim().toLocaleLowerCase()
  const emailAllowed = email
    ? appConfig.letterboxdImportAdminEmails.includes(email)
    : false

  return emailAllowed || metadataHasAdminRole(user.app_metadata)
}
