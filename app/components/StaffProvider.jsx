'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import {
  clearCurrentStaff,
  getCurrentStaff,
  saveCurrentStaff
} from '../../lib/staffSession'

const StaffContext = createContext(null)

const INACTIVITY_TIMEOUT_MS =
  10 * 60 * 1000

export default function StaffProvider({
  children
}) {
  const [currentStaff, setCurrentStaff] =
    useState(null)

  const [staffLoading, setStaffLoading] =
    useState(true)

  const inactivityTimerRef = useRef(null)

  useEffect(() => {
    const storedStaff = getCurrentStaff()

    setCurrentStaff(storedStaff)
    setStaffLoading(false)
  }, [])

  function clearInactivityTimer() {
    if (inactivityTimerRef.current) {
      clearTimeout(
        inactivityTimerRef.current
      )

      inactivityTimerRef.current = null
    }
  }

  function logoutStaff({
    redirectToLogin = false
  } = {}) {
    clearInactivityTimer()
    clearCurrentStaff()
    setCurrentStaff(null)

    if (
      redirectToLogin &&
      typeof window !== 'undefined'
    ) {
      window.location.replace('/login')
    }
  }

  function resetInactivityTimer() {
    if (!currentStaff) return

    clearInactivityTimer()

    inactivityTimerRef.current =
      setTimeout(() => {
        logoutStaff({
          redirectToLogin: true
        })
      }, INACTIVITY_TIMEOUT_MS)
  }

  useEffect(() => {
    if (!currentStaff) {
      clearInactivityTimer()
      return
    }

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ]

    const handleActivity = () => {
      resetInactivityTimer()
    }

    resetInactivityTimer()

    activityEvents.forEach((eventName) => {
      window.addEventListener(
        eventName,
        handleActivity,
        {
          passive: true
        }
      )
    })

    return () => {
      clearInactivityTimer()

      activityEvents.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            handleActivity
          )
        }
      )
    }
  }, [currentStaff])

  function loginStaff(staff) {
    saveCurrentStaff(staff)
    setCurrentStaff(staff)
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