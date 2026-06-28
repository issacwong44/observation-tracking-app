'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

export default function FormHomePage() {
  const router = useRouter()

  const [bedNo, setBedNo] = useState('')
  const [activeCases, setActiveCases] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isOpening, setIsOpening] = useState(false)

  const [showScanner, setShowScanner] = useState(false)
const [scanMessage, setScanMessage] = useState('')
const [patientSurname, setPatientSurname] = useState('')
const [wristbandScanned, setWristbandScanned] = useState(false)

const scannerRef = useRef(null)
const scannerContainerId = 'patient-wristband-reader'

  useEffect(() => {
    fetchActiveCases()

    const channel = supabase
      .channel('form_home_active_cases')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'observation_cases'
        },
        () => {
          fetchActiveCases()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
  return () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .catch(() => {})

      scannerRef.current = null
    }
  }
}, [])

  async function fetchActiveCases() {
    const { data, error } = await supabase
      .from('observation_cases')
      .select('id, bed_no')
      .is('confirmed_dc_at', null)

    if (error) {
      console.error('Fetch active cases error:', error)
      setErrorMessage('Unable to check current bed status')
    } else {
      setActiveCases(data || [])
    }

    setIsLoading(false)
  }

 function extractPatientSurname(decodedText) {
  const value = decodedText.trim()

  const match = value.match(
    /^WB\s+\S+\s+([^,]+),/i
  )

  if (!match) {
    return null
  }

  return match[1].trim().toUpperCase()
}

async function stopScanner() {
  if (scannerRef.current) {
    try {
      const scannerState =
        scannerRef.current.getState?.()

      if (scannerState === 2 || scannerState === 3) {
        await scannerRef.current.stop()
      }

      await scannerRef.current.clear()
    } catch (error) {
      console.error('Stop scanner error:', error)
    }

    scannerRef.current = null
  }

  setShowScanner(false)
}

async function startScanner() {
  setErrorMessage('')
  setScanMessage('')
  setShowScanner(true)

  try {
    const { Html5Qrcode } = await import('html5-qrcode')

    await new Promise((resolve) =>
      setTimeout(resolve, 250)
    )

    const scanner = new Html5Qrcode(
      scannerContainerId
    )

    scannerRef.current = scanner

    await scanner.start(
      {
        facingMode: 'environment'
      },
      {
        fps: 10,
        qrbox: {
          width: 260,
          height: 180
        },
        aspectRatio: 1.4
      },
      async (decodedText) => {
        const scannedSurname =
  extractPatientSurname(decodedText)

if (!scannedSurname) {
  setScanMessage(
    'Unable to recognise this patient wristband QR code.'
  )
  return
}

setPatientSurname(scannedSurname)
setWristbandScanned(true)

await stopScanner()

        await stopScanner()
      },
      () => {
        // 掃描期間未讀到QR，不需要顯示error
      }
    )
  } catch (error) {
    console.error('Start scanner error:', error)

    setShowScanner(false)

    setErrorMessage(
      'Unable to open camera. Please allow camera access.'
    )
  }
}

  function validateBedNumber(value) {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      return 'Please enter a bed number'
    }

    if (!/^\d+$/.test(trimmedValue)) {
      return 'Bed number must contain numbers only'
    }


    const isOccupied = activeCases.some(
      (item) =>
        String(item.bed_no) === String(trimmedValue)
    )

    if (isOccupied) {
      return `Bed ${trimmedValue} is already occupied`
    }

    return ''
  }

  function handleOpenForm() {
  if (isOpening || isLoading) return

  const selectedBed = bedNo.trim()
  const selectedSurname =
  patientSurname.trim().toUpperCase()

if (!selectedSurname) {
  setErrorMessage(
    'Please scan the patient wristband first'
  )
  return
}

  const validationError =
    validateBedNumber(selectedBed)

  if (validationError) {
    setErrorMessage(validationError)
    return
  }

  setErrorMessage('')
  setIsOpening(true)

  sessionStorage.setItem(
  'observation_patient_surname',
  selectedSurname
)

  router.push(
    `/form?bed=${encodeURIComponent(selectedBed)}`
  )
}

  return (
    <main className="min-h-[100dvh] bg-[#F4F6F8] px-4 pt-4 pb-28 sm:px-6 sm:pt-6 sm:pb-32 md:px-8 md:pt-8 md:pb-36">
      <div className="mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-[760px] flex-col md:min-h-[calc(100dvh-64px)]">
        {/* Header */}
        <header className="rounded-[24px] bg-[#0078AE] px-5 py-6 text-white shadow-lg sm:px-7 sm:py-7 md:rounded-[32px] md:px-9 md:py-9">
          <p className="text-sm font-semibold text-white/75 sm:text-base">
            NDH AED
          </p>

          <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
            Observation Room Case Form
          </h1>

          <p className="mt-2 text-sm text-white/80 sm:text-base md:text-lg">
            Enter a bed number to open the patient form
          </p>
        </header>

        {/* Main Card */}
        <section className="mt-4 flex flex-1 flex-col rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm sm:mt-6 sm:p-7 md:rounded-[32px] md:p-9">
          <div className="flex-1">

            <div className="mb-7">
  <label className="block text-base font-bold text-gray-800 sm:text-lg md:text-xl">
    Patient Wristband
  </label>

  {!wristbandScanned ? (
    <button
      type="button"
      onClick={startScanner}
      disabled={isOpening}
      className="mt-3 w-full rounded-2xl border-2 border-[#0078AE] bg-white px-4 py-5 text-lg font-bold text-[#0078AE] transition hover:bg-blue-50 disabled:opacity-50"
    >
      Scan Patient Wristband QR
    </button>
  ) : (
    <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-green-700">
            Wristband scanned
          </p>

          <p className="mt-2 text-xl font-bold text-gray-900">
            {patientSurname}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Patient ID: {patientId}
          </p>
        </div>

        <button
          type="button"
          onClick={startScanner}
          className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#0078AE] shadow-sm"
        >
          Scan Again
        </button>
      </div>
    </div>
  )}
</div>
            <label
              htmlFor="bed-number"
              className="block text-base font-bold text-gray-800 sm:text-lg md:text-xl"
            >
              Bed Number
            </label>


            <input
              id="bed-number"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="go"
              autoComplete="off"
              autoFocus
              value={bedNo}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/\D/g, '')

                setBedNo(numericValue)
                setErrorMessage('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleOpenForm()
                }
              }}
              placeholder="e.g. 145"
              className={`mt-4 w-full rounded-[22px] border bg-white px-5 py-5 text-center text-4xl font-bold tracking-wider text-gray-900 outline-none transition sm:py-6 sm:text-5xl md:rounded-[26px] md:py-8 md:text-6xl ${
                errorMessage
                  ? 'border-red-400 ring-2 ring-red-100'
                  : 'border-gray-300 focus:border-[#0078AE] focus:ring-4 focus:ring-blue-100'
              }`}
            />

            {errorMessage && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 sm:text-base">
                {errorMessage}
              </div>
            )}

            {!errorMessage && bedNo && (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#0078AE] sm:text-base">
                Ready to open Bed {bedNo}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => {
  setBedNo('')
  setPatientSurname('')
  setWristbandScanned(false)
  setScanMessage('')
  setErrorMessage('')
}}
                disabled={!bedNo || isOpening}
                className="rounded-2xl bg-gray-100 px-4 py-4 text-base font-bold text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 sm:py-5 sm:text-lg"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleOpenForm}
                disabled={!bedNo || isLoading || isOpening}
                className="rounded-2xl bg-[#0078AE] px-4 py-4 text-base font-bold text-white shadow-md transition hover:bg-[#00638F] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none sm:py-5 sm:text-lg"
              >
                {isLoading
                  ? 'Checking...'
                  : isOpening
                  ? 'Opening...'
                  : 'Open Form'}
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="mt-8 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between gap-4 text-sm sm:text-base">
              <span className="text-gray-500">
                Active occupied beds
              </span>

              <span className="rounded-xl bg-gray-100 px-3 py-1 font-bold text-gray-700">
                {activeCases.length}
              </span>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-gray-400 sm:text-sm">
              QR codes will continue to open the assigned bed directly. This page is an alternative manual entry point.
            </p>
          </div>
        </section>
      </div>
      {showScanner && (
  <div
    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
    onClick={stopScanner}
  >
    <div
      className="w-full max-w-[560px] rounded-3xl bg-white p-5 shadow-2xl md:p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Scan Patient Wristband
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Point the rear camera at the wristband QR code
          </p>
        </div>

        <button
          type="button"
          onClick={stopScanner}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-2xl font-bold text-gray-600"
        >
          ×
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl bg-black">
        <div
          id={scannerContainerId}
          className="min-h-[320px] w-full"
        />
      </div>

      {scanMessage && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {scanMessage}
        </div>
      )}

      <button
        type="button"
        onClick={stopScanner}
        className="mt-5 w-full rounded-2xl bg-gray-100 px-4 py-4 font-bold text-gray-700"
      >
        Cancel
      </button>
    </div>
  </div>
)}
       <BottomNav />
    </main>
  )
}