'use client'

import { useStaff } from './StaffProvider'

export default function StaffHeaderInfo() {
  const {
    currentStaff,
    logoutStaff
  } = useStaff()

  if (!currentStaff) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-left md:text-right">
        <p className="text-xs text-white/70">
          Logged in as
        </p>

        <p className="font-bold text-white">
          {currentStaff.displayName}
        </p>

        <p className="text-xs text-white/70">
          {currentStaff.staffId}
          {currentStaff.role
            ? ` · ${currentStaff.role}`
            : ''}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          logoutStaff()
          window.location.replace('/login')
        }}
        className="rounded-xl bg-white/20 px-3 py-2 text-sm font-bold text-white hover:bg-white/30"
      >
        Logout
      </button>
    </div>
  )
}