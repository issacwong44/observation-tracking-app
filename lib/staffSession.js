const CURRENT_STAFF_KEY = 'current_staff'

export function getCurrentStaff() {
  if (typeof window === 'undefined') {
    return null
  }

  const storedStaff =
    localStorage.getItem(CURRENT_STAFF_KEY)

  if (!storedStaff) {
    return null
  }

  try {
    return JSON.parse(storedStaff)
  } catch (error) {
    console.error(
      'Invalid current staff session:',
      error
    )

    localStorage.removeItem(CURRENT_STAFF_KEY)

    return null
  }
}

export function saveCurrentStaff(staff) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(
    CURRENT_STAFF_KEY,
    JSON.stringify(staff)
  )
}

export function clearCurrentStaff() {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(CURRENT_STAFF_KEY)
  localStorage.removeItem('staff')
}

export function hasCurrentStaff() {
  return !!getCurrentStaff()
}