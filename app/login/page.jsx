'use client'

import {
  Suspense,
  useEffect,
  useRef,
  useState
} from 'react'

import { useRouter, useSearchParams } from 'next/navigation'
import { ScanLine, UserRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'

import {
  useStaff
} from '../components/StaffProvider'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
  currentStaff,
  staffLoading,
  loginStaff
} = useStaff()

  const [showScanner, setShowScanner] = useState(false)
  const [scanMessage, setScanMessage] = useState('')
  const [manualStaffId, setManualStaffId] = useState('')
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const scannerRef = useRef(null)
  const scannerStoppedRef = useRef(false)
  const hasScannedRef = useRef(false)

  const redirect =
    searchParams.get('redirect') || '/dashboard'

  useEffect(() => {
  if (staffLoading) return

  if (currentStaff) {
    router.replace(redirect)
  }
}, [
  currentStaff,
  staffLoading,
  redirect,
  router
])
  async function lookupStaff(scannedValue) {
    const normalizedStaffId = String(scannedValue || '')
      .trim()
      .toUpperCase()

    if (!normalizedStaffId) {
      setScanMessage('Unable to read staff barcode.')
      return
    }

    setIsLookingUp(true)
    setScanMessage('')

    const { data, error } = await supabase.rpc(
      'scan_staff_barcode',
      {
        scanned_staff_id: normalizedStaffId
      }
    )

    setIsLookingUp(false)

    if (error) {
      console.error('Staff barcode lookup error:', error)
      setSelectedStaff(null)
      setScanMessage('Unable to verify staff barcode.')
      return
    }

    const staff = data?.[0]

    if (!staff) {
      setSelectedStaff(null)
      setScanMessage(
        'Staff ID not found or account inactive.'
      )
      return
    }

    setSelectedStaff(staff)
    setManualStaffId('')
    setScanMessage('')
  }

  async function stopScanner() {
    if (
      scannerRef.current &&
      !scannerStoppedRef.current
    ) {
      scannerStoppedRef.current = true

      try {
        await scannerRef.current.stop()
      } catch (error) {
        console.log('Scanner stop ignored:', error)
      }
    }
  }

  useEffect(() => {
    if (!showScanner) return

    let mounted = true

    scannerStoppedRef.current = false
    hasScannedRef.current = false

    async function startScanner() {
      const { Html5Qrcode } = await import('html5-qrcode')

      if (!mounted) return

      const scanner =
        new Html5Qrcode('staff-barcode-reader')

      scannerRef.current = scanner

      await scanner.start(
        {
          facingMode: 'environment'
        },
        {
          fps: 8,
          qrbox: {
            width: 300,
            height: 140
          }
        },
        async (decodedText) => {
          if (hasScannedRef.current) return

          hasScannedRef.current = true

          await stopScanner()

          setShowScanner(false)

          await lookupStaff(decodedText)
        },
        () => {
          // Ignore normal scan misses
        }
      )
    }

    startScanner().catch((error) => {
      console.error('Staff scanner error:', error)
      setShowScanner(false)
      setScanMessage('Unable to start camera scanner.')
    })

    return () => {
      mounted = false
      stopScanner()
    }
  }, [showScanner])

function confirmLogin() {
  if (!selectedStaff || isLoggingIn) return

  setIsLoggingIn(true)

  const staffSession = {
    id: selectedStaff.id,
    staffId: selectedStaff.staff_id,
    displayName: selectedStaff.display_name,
    role: selectedStaff.role || '',
    loggedInAt: new Date().toISOString()
  }

  loginStaff(staffSession)

  router.replace(redirect)
}

  async function closeScanner() {
    await stopScanner()
    setShowScanner(false)
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-8">
      <div className="mx-auto w-full max-w-[520px]">
        <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-[#0078AE]">
              <UserRound size={42} />
            </div>

            <h1 className="mt-5 text-3xl font-bold text-gray-900">
              Staff Login
            </h1>

          <p className="mt-2 text-gray-500">
  Scan staff barcode or enter Staff ID
</p>
          </div>

          {!selectedStaff ? (
<div className="mt-8 space-y-4">
  {/* Scan barcode */}
  <button
    type="button"
    disabled={isLookingUp}
    onClick={() => {
      setScanMessage('')
      setShowScanner(true)
    }}
    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0078AE] px-5 py-5 text-lg font-bold text-white hover:bg-[#00638F] disabled:opacity-50"
  >
    <ScanLine size={26} />

    {isLookingUp
      ? 'Checking Staff...'
      : 'Scan Staff Barcode'}
  </button>

  <div className="flex items-center gap-3">
    <div className="h-px flex-1 bg-gray-200" />

    <span className="text-sm font-bold text-gray-400">
      OR
    </span>

    <div className="h-px flex-1 bg-gray-200" />
  </div>

  {/* Manual Staff ID */}
  <form
    onSubmit={async (event) => {
      event.preventDefault()

      await lookupStaff(manualStaffId)
    }}
    className="space-y-3"
  >
    <label className="block text-sm font-bold text-gray-700">
      Staff ID
    </label>

    <input
      value={manualStaffId}
      onChange={(event) => {
        setManualStaffId(
          event.target.value.toUpperCase()
        )

        if (scanMessage) {
          setScanMessage('')
        }
      }}
      placeholder="Enter Staff ID"
      autoCapitalize="characters"
      autoComplete="off"
      disabled={isLookingUp}
      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-4 text-center text-lg font-bold uppercase tracking-wider text-gray-900 outline-none focus:border-[#0078AE] focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
    />

    <button
      type="submit"
      disabled={
        isLookingUp ||
        !manualStaffId.trim()
      }
      className="w-full rounded-2xl bg-gray-200 px-5 py-4 text-lg font-bold text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLookingUp
        ? 'Checking Staff...'
        : 'Continue with Staff ID'}
    </button>
  </form>

  {scanMessage && (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center font-semibold text-red-600">
      {scanMessage}
    </div>
  )}
</div>
          ) : (
            <div className="mt-8">
              <div className="rounded-3xl border border-green-200 bg-green-50 p-5">
                <p className="text-sm font-bold uppercase tracking-wide text-green-700">
                  Staff verified
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {selectedStaff.display_name}
                </p>

                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p>
                    Staff ID:{' '}
                    <span className="font-bold">
                      {selectedStaff.staff_id}
                    </span>
                  </p>

                  <p>
                    Role:{' '}
                    <span className="font-bold">
                      {selectedStaff.role || '-'}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isLoggingIn}
                onClick={confirmLogin}
                className="mt-5 w-full rounded-2xl bg-[#0078AE] px-5 py-4 text-lg font-bold text-white hover:bg-[#00638F] disabled:opacity-50"
              >
                {isLoggingIn
                  ? 'Signing In...'
                  : 'Confirm Login'}
              </button>

              <button
                type="button"
                disabled={isLoggingIn}
                onClick={() => {
                  setSelectedStaff(null)
                  setScanMessage('')
                }}
                className="mt-3 w-full rounded-2xl bg-gray-100 px-5 py-4 font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Scan Again
              </button>
            </div>
          )}
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[560px] rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Scan Staff Barcode
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Point the rear camera at the staff ID barcode
                </p>
              </div>

              <button
                type="button"
                onClick={closeScanner}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-2xl font-bold text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl bg-black">
              <div
                id="staff-barcode-reader"
                className="min-h-[320px] w-full"
              />
            </div>

            <button
              type="button"
              onClick={closeScanner}
              className="mt-5 w-full rounded-2xl bg-gray-100 px-4 py-4 font-bold text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}