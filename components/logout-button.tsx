"use client"

import { Button } from "@/components/ui/button"
import { logout } from "@/actions/auth"

export function LogoutButton() {
  const handleSignOut = async () => {
    await logout()
  }

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Sign Out
    </Button>
  )
}
