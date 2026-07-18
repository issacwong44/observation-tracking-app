'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import {
  clearCurrentStaff,
  getCurrentStaff,
  saveCurrentStaff
} from '../../lib/staffSession'

const StaffContext = createContext(null)

export default function StaffProvider({
  children
}) {
  const [currentStaff, setCurrentStaff] =
    useState(null)

  const [staffLoading, setStaffLoading] =
    useState(true)

  useEffect(() => {
    const storedStaff = getCurrentStaff()

    setCurrentStaff(storedStaff)
    setStaffLoading(false)
  }, [])

  function loginStaff(staff) {
    saveCurrentStaff(staff)
    setCurrentStaff(staff)
  }

  function logoutStaff() {
    clearCurrentStaff()
    setCurrentStaff(null)
  }

  return (
    <StaffContext.Provider
      value={{
        currentStaff,
        staffLoading,
        loginStaff,
        logoutStaff
      }}
    >
      {children}
    </StaffContext.Provider>
  )
}

export function useStaff() {
  const context = useContext(StaffContext)

  if (!context) {
    throw new Error(
      'useStaff must be used inside StaffProvider'
    )
  }

  return context
}