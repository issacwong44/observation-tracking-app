'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Bell, Mars, Venus } from 'lucide-react'
import BottomNav from '../components/BottomNav'

export default function HandoverPage({
  initialTab = 'observation'
}) {
  const [cases, setCases] = useState([])
  const [handoverNotes, setHandoverNotes] = useState({})
const saveTimers = useRef({})
const [saveStatus, setSaveStatus] = useState({})
const [isEditingNote, setIsEditingNote] = useState(false)
  const [detailModal, setDetailModal] = useState(null)
const [handoverChecks, setHandoverChecks] = useState({})
const [hideConfirmModal, setHideConfirmModal] = useState(null)
const [psyHideConfirmModal, setPsyHideConfirmModal] = useState(null)
const [addHandoverModal, setAddHandoverModal] = useState(false)
const [sortOrder, setSortOrder] = useState('newest')
const [handoverTab, setHandoverTab] =
  useState(initialTab)
const [psyCases, setPsyCases] = useState([])
const [psyFreeTextNotes, setPsyFreeTextNotes] = useState({})
const [psyFreeTextSaveStatus, setPsyFreeTextSaveStatus] = useState({})

const [addPsyCaseModal, setAddPsyCaseModal] = useState(false)

const [psyGender, setPsyGender] = useState('')
const [psyAge, setPsyAge] = useState('')
const [psyChiefComplaint, setPsyChiefComplaint] = useState('')
const [psyLocation, setPsyLocation] = useState('')
const [psyAeSuffix, setPsyAeSuffix] = useState('')
const [showPsyAeScanner, setShowPsyAeScanner] = useState(false)
const [psyAeScanMessage, setPsyAeScanMessage] = useState('')
const [selectedObservationCaseId, setSelectedObservationCaseId] =
  useState('')

const PSY_STATUS_PENDING_DOCTOR = 'Pending Doctor Consultation'
const PSY_STATUS_AWAITING_PSYCH = 'Awaiting Psych Review'
const PSY_STATUS_COMPLETE = 'Complete'
const [psyEditModal, setPsyEditModal] = useState(null)

const [psyEditStatus, setPsyEditStatus] = useState(PSY_STATUS_PENDING_DOCTOR)
const [psyEditOutcome, setPsyEditOutcome] = useState('')
const [psyMonitoringChecks, setPsyMonitoringChecks] = useState({})
const [psyMiscChecks, setPsyMiscChecks] = useState({})

const [psyOutcomeType, setPsyOutcomeType] = useState('')
const [psyAdmissionForm, setPsyAdmissionForm] = useState('')
const [psyHospital, setPsyHospital] = useState('')
const [psyWard, setPsyWard] = useState('')
const [psyFaxTime, setPsyFaxTime] = useState('')
const [psyReplyTime, setPsyReplyTime] = useState('')
const [psyTransport, setPsyTransport] = useState('')
const [psyJudge, setPsyJudge] = useState(false)

const [isPsyDischarging, setIsPsyDischarging] = useState(false)
const [psyDischargeConfirmModal, setPsyDischargeConfirmModal] = useState(null)

function extractAeSuffix(decodedText) {
  const value = String(decodedText || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')

  const match = value.match(/AE[A-Z0-9]+/)

  if (!match) {
    return null
  }

  const aeNumber = match[0]

  if (aeNumber.length < 7) {
    return null
  }

  return aeNumber.slice(-5)
}

 useEffect(() => {
  fetchCases()
  fetchPsyCases()

  const interval = setInterval(() => {
    if (!isEditingNote) {
      fetchCases()
      fetchPsyCases()
    }
  }, 5000)

  return () => clearInterval(interval)
}, [isEditingNote])

useEffect(() => {
  if (!showPsyAeScanner) return

  let scanner
  let isStopped = false
  let hasScanned = false

  async function runPsyAeScanner() {
    const { Html5Qrcode } = await import('html5-qrcode')

    scanner = new Html5Qrcode('psy-ae-reader')

    await scanner.start(
      {
        facingMode: 'environment',
      },
      {
        fps: 8,
        qrbox: {
          width: 300,
          height: 120,
        },
      },
      async (decodedText) => {
        if (hasScanned) return

        hasScanned = true

        const scannedAeSuffix =
          extractAeSuffix(decodedText)

        if (!scannedAeSuffix) {
          hasScanned = false
          setPsyAeScanMessage(
            'Unable to recognise the AE barcode.'
          )
          return
        }

        setPsyAeSuffix(scannedAeSuffix)
        setPsyAeScanMessage('')

        try {
          if (!isStopped && scanner) {
            isStopped = true
            await scanner.stop()
          }
        } catch (error) {
          console.log(
            'Psychiatric AE scanner stop ignored:',
            error
          )
        }

        setTimeout(() => {
          setShowPsyAeScanner(false)
        }, 300)
      },
      () => {
        // Ignore normal scan errors
      }
    )
  }

  runPsyAeScanner().catch((error) => {
    console.error(
      'Psychiatric AE scanner start error:',
      error
    )

    setPsyAeScanMessage(
      'Unable to start camera scanner.'
    )

    setShowPsyAeScanner(false)
  })

  return () => {
    if (scanner && !isStopped) {
      isStopped = true
      scanner.stop().catch(() => {})
    }
  }
}, [showPsyAeScanner])

  async function fetchCases() {
    const { data, error } = await supabase
      .from('observation_cases')
      .select('*')
      .is('confirmed_dc_at', null)
      .order('created_at', { ascending: false })

    if (!error) {
  setCases(data || [])

  const notes = {}
  ;(data || []).forEach((item) => {
    notes[item.id] = item.handover_note || ''
  })

  setHandoverNotes(notes)
}
  }

  async function openObservationDetail(item) {
  setDetailModal(item)
  setHandoverChecks(item.handover_done || {})

  const hasUnreadHandover =
    item.nursing_handover &&
    item.nursing_handover.trim() !== '' &&
    item.handover_seen !== true

  if (!hasUnreadHandover) return

  const seenAt = new Date().toISOString()

  // 先即時更新畫面，badge會立即消失
  setCases((prev) =>
    prev.map((caseItem) =>
      caseItem.id === item.id
        ? {
            ...caseItem,
            handover_seen: true,
            handover_seen_at: seenAt
          }
        : caseItem
    )
  )

  const { error } = await supabase
    .from('observation_cases')
    .update({
      handover_seen: true,
      handover_seen_at: seenAt
    })
    .eq('id', item.id)

  if (error) {
    console.error(
      'Failed to clear handover notification:',
      error
    )

    // Save失敗就重新讀資料
    fetchCases()
  }
}

function getHandoverTags(item) {
  return item.nursing_handover
    ? item.nursing_handover.split(',').map((tag) => tag.trim())
    : []
}

function isHandoverTagDone(item, tagName) {
  return item.handover_done?.[tagName] === true
}

  function handleHandoverNoteChange(id, value) {
  setHandoverNotes((prev) => ({
    ...prev,
    [id]: value
  }))

  setSaveStatus((prev) => ({
    ...prev,
    [id]: 'saving'
  }))

  if (saveTimers.current[id]) {
    clearTimeout(saveTimers.current[id])
  }

  saveTimers.current[id] = setTimeout(async () => {
    const { error } = await supabase
      .from('observation_cases')
      .update({
        handover_note: value
      })
      .eq('id', id)

    setSaveStatus((prev) => ({
      ...prev,
      [id]: error ? 'error' : 'saved'
    }))

    if (!error) {
      setTimeout(() => {
        setSaveStatus((prev) => ({
          ...prev,
          [id]: ''
        }))
      }, 2000)
    }
  }, 800)
}
async function addToHandover(id) {
  const { error } = await supabase
    .from('observation_cases')
    .update({
      handover_manual: true,
      handover_hidden: false
    })
    .eq('id', id)

  if (!error) {
    setAddHandoverModal(false)
    fetchCases()
  }
}
async function hideFromHandover(id) {
  const { error } = await supabase
    .from('observation_cases')
    .update({
      handover_hidden: true
    })
    .eq('id', id)

  if (!error) {
    setHideConfirmModal(null)
    fetchCases()
  }
}

async function hidePsyFromHandover(id) {
  const { error } = await supabase
    .from('psy_handover_cases')
    .update({
      handover_hidden: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Hide psychiatric case error:', error)
    alert('Failed to hide psychiatric case')
    return
  }

  setPsyHideConfirmModal(null)
  fetchPsyCases()
}

function isStayOvernightBed(bedNo) {
  const num = Number(bedNo)
  return num >= 1 && num <= 10
}
function exportHandoverPDF(type) {
  const exportCases =
    type === 'all'
      ? cases
      : sortedHandoverCases

  const title =
    type === 'all'
      ? 'All Observation Cases'
      : 'Current Handover Cases'

  const now = new Date().toLocaleString('en-GB')

  const summaryGroups = [
  {
    title: 'AOM',
    list: aomCases
  },
  {
    title: 'IVF',
    list: ivfCases
  },
  {
    title: 'Stayovernight',
    list: stayOvernightCases
  },
  {
    title: 'Fall Risk',
    list: fallRiskCases
  },
  {
    title: 'PSY / SP / Missing',
    list: psySpMissingCases
  },
  {
    title: 'HI',
    list: hiCases
  },
  {
    title: 'Q1H Monitoring',
    list: q1hCases
  }
]

const summaryHtml = summaryGroups
  .map((group) => {
    const beds =
      group.list.length === 0
        ? '-'
        : group.list
            .map((item) => `Bed ${item.bed_no}`)
            .join(', ')

    return `
      <div class="summary-card">
        <div class="summary-title">${group.title}</div>
        <div class="summary-count">${group.list.length}</div>
        <div class="summary-beds">${beds}</div>
      </div>
    `
  })
  .join('')

  const rows = exportCases
    .map((item) => {
      const handover = item.nursing_handover || '-'
      const remarks = item.remarks || '-'
      const note = handoverNotes[item.id] || item.handover_note || '-'
      const diagnosis = item.diagnosis || '-'

      const status = !item.acknowledged_at
        ? 'Pending Ack'
        : !item.vs_taken_at
        ? 'Pending VS'
        : 'In Observation'

      return `
        <tr>
          <td>Bed ${item.bed_no || '-'}</td>
          <td>${item.gender || '-'}</td>
          <td>${item.age || '-'}</td>
          <td>Cat ${item.category || '-'}</td>
          <td>${diagnosis}</td>
          <td>${status}</td>
          <td>${handover}</td>
          <td>${remarks}</td>
          <td>${note}</td>
        </tr>
      `
    })
    .join('')

  const printWindow = window.open('', '_blank')

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
        .summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 22px;
}

.summary-card {
  border: 1px solid #D1D5DB;
  border-radius: 12px;
  padding: 10px;
  background: #F9FAFB;
}

.summary-title {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
}

.summary-count {
  font-size: 24px;
  font-weight: 800;
  color: #0078AE;
  margin-top: 4px;
}

.summary-beds {
  font-size: 12px;
  color: #4B5563;
  margin-top: 6px;
}
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #111827;
          }

          h1 {
            margin-bottom: 4px;
            color: #0078AE;
          }

          .subtitle {
            margin-bottom: 20px;
            color: #6B7280;
            font-size: 13px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th {
            background: #0078AE;
            color: white;
            padding: 8px;
            border: 1px solid #D1D5DB;
            text-align: left;
          }

          td {
            padding: 8px;
            border: 1px solid #D1D5DB;
            vertical-align: top;
          }

          tr:nth-child(even) {
            background: #F9FAFB;
          }

          @media print {
            body {
              padding: 12px;
            }

            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <h1>${title}</h1>
        <div class="subtitle">
  Exported at ${now} | Total: ${exportCases.length}
</div>

<h2>Summary</h2>

<div class="summary-grid">
  ${summaryHtml}
</div>

<table>
          <thead>
            <tr>
              <th>Bed</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Cat</th>
              <th>Diagnosis</th>
              <th>Status</th>
              <th>Handover</th>
              <th>Remarks</th>
              <th>Free Text</th>
            </tr>
          </thead>

          <tbody>
            ${rows || `
              <tr>
                <td colspan="9">No cases</td>
              </tr>
            `}
          </tbody>
        </table>

        <script>
          window.onload = function () {
            window.print()
          }
        </script>
      </body>
    </html>
  `)

  printWindow.document.close()
}

async function fetchPsyCases() {
  const { data, error } = await supabase
    .from('psy_handover_cases')
    .select('*')
    .eq('handover_hidden', false)
    .order('created_at', { ascending: false })

  if (!error) {
  setPsyCases(data || [])

  const notes = {}
  ;(data || []).forEach((item) => {
    notes[item.id] = item.free_text || ''
  })

  setPsyFreeTextNotes(notes)
} else {
  console.log(error)
}
}
function handlePsyFreeTextChange(id, value) {
  setPsyFreeTextNotes((prev) => ({
    ...prev,
    [id]: value
  }))

  setPsyFreeTextSaveStatus((prev) => ({
    ...prev,
    [id]: 'saving'
  }))

  const timerKey = `psy-${id}`

  if (saveTimers.current[timerKey]) {
    clearTimeout(saveTimers.current[timerKey])
  }

  saveTimers.current[timerKey] = setTimeout(async () => {
    const { error } = await supabase
      .from('psy_handover_cases')
      .update({
        free_text: value,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    setPsyFreeTextSaveStatus((prev) => ({
      ...prev,
      [id]: error ? 'error' : 'saved'
    }))

    if (!error) {
      setTimeout(() => {
        setPsyFreeTextSaveStatus((prev) => ({
          ...prev,
          [id]: ''
        }))
      }, 2000)
    }
  }, 800)
}

function handleSelectObservationCase(caseId) {
  setSelectedObservationCaseId(caseId)

  if (!caseId) {
  setPsyGender('')
  setPsyAge('')
  setPsyChiefComplaint('')
  setPsyLocation('')
  setPsyAeSuffix('')
  return
}

  const selectedCase = cases.find(
    (item) => String(item.id) === String(caseId)
  )

  if (!selectedCase) return

  setPsyGender(selectedCase.gender || '')

  setPsyAge(
    selectedCase.age !== null &&
    selectedCase.age !== undefined
      ? String(selectedCase.age)
      : ''
  )

  setPsyChiefComplaint(
    selectedCase.diagnosis || ''
  )

  setPsyLocation('Observation Room')

  setPsyAeSuffix(
  selectedCase.ae_suffix || ''
)
}


function resetPsyForm() {
  setSelectedObservationCaseId('')
  setPsyGender('')
  setPsyAge('')
  setPsyAeSuffix('')
  setPsyAeScanMessage('')
  setShowPsyAeScanner(false)
  setPsyChiefComplaint('')
  setPsyLocation('')
}

const selectedObservationCase = selectedObservationCaseId
  ? cases.find(
      (item) =>
        String(item.id) ===
        String(selectedObservationCaseId)
    )
  : null

async function handleAddPsyCase() {
  const selectedObservationCase =
    selectedObservationCaseId
      ? cases.find(
          (item) =>
            String(item.id) ===
            String(selectedObservationCaseId)
        )
      : null

  const normalizedPsyAeSuffix =
    psyAeSuffix.trim().toUpperCase()

  if (
    !psyGender ||
    !psyAge ||
    (!selectedObservationCase &&
      !psyChiefComplaint.trim()) ||
    (!selectedObservationCase &&
      !psyLocation.trim()) ||
    !normalizedPsyAeSuffix
  ) {
    alert(
      selectedObservationCase
        ? 'Please complete Gender, Age and AE reference'
        : 'Please scan the AE barcode and complete Gender, Age, Chief Complaint and Location'
    )
    return
  }

  if (
    !/^[A-Z0-9]{5}$/.test(
      normalizedPsyAeSuffix
    )
  ) {
    alert(
      'AE reference must contain exactly 5 letters or numbers'
    )
    return
  }

  // Duplicate check只針對手動Ambulatory case
  if (!selectedObservationCase) {
    const {
      data: existingObservationCase,
      error: observationCheckError
    } = await supabase
      .from('observation_cases')
      .select('id, bed_no, ae_suffix')
      .eq('ae_suffix', normalizedPsyAeSuffix)
      .is('confirmed_dc_at', null)
      .maybeSingle()

    if (observationCheckError) {
      console.error(
        'Check duplicate observation AE error:',
        observationCheckError
      )
      alert('Unable to check duplicate AE reference')
      return
    }

    if (existingObservationCase) {
      alert(
        `This AE reference already exists at Bed ${existingObservationCase.bed_no}. Please select the patient from Observation Room instead.`
      )
      return
    }

    const {
      data: existingPsyCase,
      error: psyCheckError
    } = await supabase
      .from('psy_handover_cases')
      .select('id, bed_no, patient_label, ae_suffix')
      .eq('ae_suffix', normalizedPsyAeSuffix)
      .eq('handover_hidden', false)
      .maybeSingle()

    if (psyCheckError) {
      console.error(
        'Check duplicate psychiatric AE error:',
        psyCheckError
      )
      alert('Unable to check duplicate AE reference')
      return
    }

    if (existingPsyCase) {
      alert(
        existingPsyCase.bed_no
          ? `This AE reference already has an active psychiatric case at Bed ${existingPsyCase.bed_no}.`
          : 'This AE reference already has an active ambulatory psychiatric case.'
      )
      return
    }
  }

  const { error } = await supabase
    .from('psy_handover_cases')
    .insert([
      {
        observation_case_id:
          selectedObservationCase?.id || null,

        bed_no:
          selectedObservationCase?.bed_no || null,

        ae_suffix:
          normalizedPsyAeSuffix,

        patient_label:
          `AE•••••${normalizedPsyAeSuffix}`,

        gender: psyGender,
        age: psyAge,
        location: psyLocation.trim(),
        chief_complaint:
          psyChiefComplaint.trim(),

        risk_type: '',
        status: PSY_STATUS_PENDING_DOCTOR,

        progress: '',
        outcome: '',
        miscellaneous: '',
        free_text: '',

        source: selectedObservationCase
          ? 'observation_form'
          : 'manual',

        handover_hidden: false
      }
    ])

  if (error) {
    console.log(error)
    alert('Error adding psychiatric case')
    return
  }

  setAddPsyCaseModal(false)
  resetPsyForm()
  fetchPsyCases()
}

function openPsyEditModal(item) {
  setPsyEditModal(item)

  setPsyEditStatus(item.status || PSY_STATUS_PENDING_DOCTOR)
  setPsyEditOutcome(item.outcome || '')
  setPsyMonitoringChecks(item.monitoring_checks || {})
  setPsyMiscChecks(item.miscellaneous_checks || {})

  const details = item.outcome_details || {}

  setPsyOutcomeType(details.type || '')
  setPsyAdmissionForm(details.admission_form || '')
  setPsyHospital(details.hospital || '')
  setPsyWard(details.ward || '')
  setPsyFaxTime(details.fax_time || '')
  setPsyReplyTime(details.reply_time || '')
  setPsyTransport(details.transport || '')
  setPsyJudge(details.judge === true)
}

async function confirmDischargePsyCase() {
  if (!psyDischargeConfirmModal || isPsyDischarging) return

  const psyCase = psyDischargeConfirmModal
  const dischargeTime = new Date().toISOString()

  setIsPsyDischarging(true)

  try {
    const linkedObservationCase =
      psyCase.observation_case_id
        ? cases.find(
            (item) => item.id === psyCase.observation_case_id
          )
        : cases.find(
            (item) =>
              psyCase.bed_no &&
              String(item.bed_no) === String(psyCase.bed_no)
          )

    if (linkedObservationCase) {
      const { error: observationError } = await supabase
        .from('observation_cases')
        .update({
          confirmed_dc_at: dischargeTime,
          handover_hidden: true
        })
        .eq('id', linkedObservationCase.id)

      if (observationError) {
        throw observationError
      }
    }

    const { error: psyError } = await supabase
      .from('psy_handover_cases')
      .update({
        status: PSY_STATUS_COMPLETE,
        outcome: 'Discharge',
        outcome_details: {
          type: 'Discharge',
          admission_form: '',
          hospital: '',
          ward: '',
          fax_time: '',
          reply_time: '',
          transport: '',
          judge: false
        },
        handover_hidden: true,
        updated_at: dischargeTime
      })
      .eq('id', psyCase.id)

    if (psyError) {
      throw psyError
    }

    setPsyDischargeConfirmModal(null)
    setPsyEditModal(null)

    await Promise.all([
      fetchCases(),
      fetchPsyCases()
    ])
  } catch (error) {
    console.error('Psychiatric discharge error:', error)
    alert('Discharge failed. Please try again.')
  } finally {
    setIsPsyDischarging(false)
  }
}

async function savePsyChecklist() {
  if (!psyEditModal) return
  if (
  psyEditStatus === PSY_STATUS_COMPLETE &&
  psyOutcomeType === 'Discharge'
) {
  await dischargePsyCase()
  return
}

  const outcomeDetails =
  psyEditStatus === PSY_STATUS_COMPLETE
    ? {
        type: psyOutcomeType,
        admission_form: psyOutcomeType === 'Admission' ? psyAdmissionForm : '',
        hospital: psyOutcomeType === 'Admission' ? psyHospital : '',
        ward: psyOutcomeType === 'Admission' ? psyWard : '',
        fax_time:
          psyOutcomeType === 'Admission' && psyAdmissionForm
            ? psyFaxTime
            : '',
        reply_time:
          psyOutcomeType === 'Admission' && psyAdmissionForm
            ? psyReplyTime
            : '',
        transport: psyOutcomeType === 'Admission' ? psyTransport : '',
        judge:
          psyOutcomeType === 'Admission' &&
          psyAdmissionForm === 'F123'
            ? psyJudge
            : false
      }
    : {}

  const outcomeSummary =
    psyEditStatus === PSY_STATUS_COMPLETE
      ? psyOutcomeType === 'Admission'
        ? `Admission${psyHospital ? ` - ${psyHospital}` : ''}${psyWard ? ` ${psyWard}` : ''}`
        : psyOutcomeType === 'Discharge'
        ? 'Discharge'
        : ''
      : ''

  const { error } = await supabase
    .from('psy_handover_cases')
    .update({
      status: psyEditStatus,
      outcome: outcomeSummary,
      outcome_details: outcomeDetails,
      monitoring_checks: psyMonitoringChecks,
      miscellaneous_checks: psyMiscChecks,
      updated_at: new Date().toISOString()
    })
    .eq('id', psyEditModal.id)

  if (error) {
    console.log(error)
    alert('Error saving psychiatric checklist')
    return
  }

  setPsyEditModal(null)
  fetchPsyCases()
}

const handoverCases = cases.filter((item) => {
  const isCatOneOrTwo =
    Number(item.category) === 1 || Number(item.category) === 2

  const hasHandover =
    item.nursing_handover &&
    item.nursing_handover.trim() !== ''

  const isStayOvernight =
    isStayOvernightBed(item.bed_no)

  const isManualHandover =
    item.handover_manual === true

  return (
    (isCatOneOrTwo || hasHandover || isStayOvernight || isManualHandover) &&
    !item.handover_hidden
  )
})
const sortedHandoverCases = [...handoverCases].sort((a, b) => {
  if (sortOrder === 'newest') {
    return new Date(b.created_at) - new Date(a.created_at)
  }

  if (sortOrder === 'oldest') {
    return new Date(a.created_at) - new Date(b.created_at)
  }

  if (sortOrder === 'cat_high') {
    const catDiff = Number(a.category) - Number(b.category)

    if (catDiff !== 0) return catDiff

    return new Date(b.created_at) - new Date(a.created_at)
  }

  if (sortOrder === 'cat_low') {
    const catDiff = Number(b.category) - Number(a.category)

    if (catDiff !== 0) return catDiff

    return new Date(b.created_at) - new Date(a.created_at)
  }

  return 0
})
const addableHandoverCases = cases.filter((item) => {
  const alreadyInHandover =
    handoverCases.some((handoverItem) => handoverItem.id === item.id)

  return !alreadyInHandover
})
const aomCases = cases.filter((item) => {
  const tags = getHandoverTags(item)

  return (
    tags.includes('AOM') &&
    !isHandoverTagDone(item, 'AOM')
  )
})

const ivfCases = cases.filter((item) => {
  const tags = getHandoverTags(item)

  return (
    tags.includes('IVF') &&
    !isHandoverTagDone(item, 'IVF')
  )
})
const stayOvernightCases = cases.filter((item) =>
  isStayOvernightBed(item.bed_no)
)
const fallRiskCases = cases.filter(
  (item) => item.fall_risk === 'Yes'
)

const psySpMissingCases = cases.filter(
  (item) => item.missing_risk
)

const hiCases = cases.filter(
  (item) => item.head_injury === true
)

const q1hCases = cases.filter(
  (item) => item.q1h_monitoring === true
)
const psychiatricCases = psyCases

const unreadHandoverCases = cases.filter((item) => {
  const hasNursingHandover =
    item.nursing_handover &&
    item.nursing_handover.trim() !== ''

  return (
    hasNursingHandover &&
    item.handover_seen !== true &&
    !item.handover_hidden
  )
})

const unreadHandoverCount = unreadHandoverCases.length

const selectableObservationCases = cases
  .filter((observationItem) => {
    const alreadyAdded = psyCases.some(
      (psyItem) =>
        psyItem.observation_case_id === observationItem.id &&
        !psyItem.handover_hidden
    )

    return !alreadyAdded
  })
  .sort((a, b) => {
    return Number(a.bed_no) - Number(b.bed_no)
  })

function getLinkedPsyCase(item) {
  return psyCases.find((psy) => {
    const sameObservationCase =
      psy.observation_case_id && psy.observation_case_id === item.id

    const sameBed =
      psy.bed_no && item.bed_no && String(psy.bed_no) === String(item.bed_no)

    return sameObservationCase || sameBed
  })
}

const awaitingPsychCases = psychiatricCases.filter((item) =>
  item.status === 'Awaiting Psych Review'
)

const highRiskPsyCases = psychiatricCases.filter((item) =>
  ['SP', 'Violence', 'Absconding'].includes(item.risk)
)

const forAdmissionPsyCases = psychiatricCases.filter((item) =>
  item.status === 'For Admission'
)

  return (
    <main className="min-h-screen bg-[#F5F5F7] pb-32 md:pb-36">
      {/* Header */}
      <div className="h-20 md:h-28 bg-[#0078AE] text-white shadow-sm px-5 md:px-8 flex flex-col justify-center">
  <h1 className="text-xl md:text-3xl font-bold">
  {handoverTab === 'psy'
    ? 'Psychiatric Handover'
    : 'Observation Handover'}
</h1>

<p className="text-sm md:text-lg text-white/80">
  {handoverTab === 'psy'
    ? 'Psychiatric patient handover board'
    : 'Observation Room handover board'}
</p>
</div>

    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 md:mt-8 mb-4 md:mb-6 px-4 md:px-8">
        </div>


 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 md:mt-8 mb-4 md:mb-6 px-4 md:px-8">
  <Link
    href="/dashboard"
    className="inline-flex items-center gap-2 text-[#0078AE] font-bold"
  >
    ← Back to Dashboard
  </Link>

 {handoverTab === 'observation' && (
  <div className="flex flex-col md:flex-row gap-3 md:items-center">
   <select
  defaultValue=""
  onChange={(e) => {
    const value = e.target.value

    if (!value) return

    exportHandoverPDF(value)

    e.target.value = ''
  }}
  className="w-full md:w-[165px] bg-white border border-gray-300 rounded-2xl px-4 py-3 text-base md:text-lg font-bold text-gray-700 shadow-md outline-none"
>
      <option value="" disabled>
        Export PDF
      </option>

      <option value="all">
        Export All Cases
      </option>

      <option value="handover">
        Export Selected Cases
      </option>
    </select>

    <select
      value={sortOrder}
      onChange={(e) => setSortOrder(e.target.value)}
      className="w-full md:w-auto bg-white border border-gray-300 rounded-2xl px-4 md:px-5 py-3 text-base md:text-lg font-bold text-gray-700 shadow-md outline-none"
    >
      <option value="newest">Time: New to Old</option>
      <option value="oldest">Time: Old to New</option>
      <option value="cat_high">Category: Cat 1 to Cat 5</option>
      <option value="cat_low">Category: Cat 5 to Cat 1</option>
    </select>
  </div>
)}
</div>
{handoverTab === 'observation' ? (
        <div className="bg-white rounded-[28px] md:rounded-[36px] shadow-sm border border-gray-200 overflow-hidden">

         <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] min-h-[calc(100vh-190px)]">

            {/* Left side */}
            <div className="order-2 md:order-1 md:border-r border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] bg-gray-50 border-b border-gray-200">
                <div className="p-4 md:p-6 font-bold text-[#0078AE]">
                  Bed Card
                </div>
                <div className="p-4 md:p-6 font-bold text-gray-500 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <span>
      Handover Notes
    </span>

    <div className="relative">
      <Bell
        size={20}
        className={
          unreadHandoverCount > 0
            ? 'text-red-500'
            : 'text-gray-400'
        }
      />

      {unreadHandoverCount > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unreadHandoverCount > 9
            ? '9+'
            : unreadHandoverCount}
        </span>
      )}
    </div>
  </div>

  <button
    onClick={() => setAddHandoverModal(true)}
    className="bg-[#0078AE] hover:bg-[#00638F] text-white w-9 h-9 rounded-full text-2xl font-bold flex items-center justify-center shadow-md"
  >
    +
  </button>
</div>
              </div>

            {sortedHandoverCases.map((item) => {
  const handoverTags = item.nursing_handover
  ? item.nursing_handover
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  : []

const hasHandover = handoverTags.length > 0

const allHandoverDone =
  hasHandover &&
  handoverTags.every((tag) => item.handover_done?.[tag])

const linkedPsyCase = getLinkedPsyCase(item)
    

  return (
    
  <div
    key={item.id}
    onClick={() => openObservationDetail(item)}
   className="grid grid-cols-1 md:grid-cols-[260px_1fr] border-b-4 border-gray-300 cursor-pointer hover:bg-gray-50 transition"
  > 
                  {/* Bed card */}
                  <div className="p-4 md:p-5 md:border-r border-gray-100">
                    <div className="inline-flex px-3 py-2 rounded-2xl bg-blue-100 text-[#0078AE] font-bold mb-3">
                      Bed {item.bed_no}
                    </div>

                    <div className="space-y-2 text-xs md:text-sm text-gray-500">

  {/* Gender + Age */}
<div className="flex justify-between items-center">
  <div className="flex items-center gap-2">
    {item.gender === 'M' ? (
      <>
        <Mars size={18} className="text-[#2F80ED]" />
        <span className="font-bold text-[#2F80ED]">M</span>
      </>
    ) : (
      <>
        <Venus size={18} className="text-[#D94F70]" />
        <span className="font-bold text-[#D94F70]">F</span>
      </>
    )}
  </div>

  <span className="font-bold text-gray-900">
    {item.age}
  </span>
</div>

  {/* Category */}
  <div className="flex justify-between">
    <span>Cat</span>

    <span
      className={`px-3 py-1 rounded-xl font-bold text-xs ${
        Number(item.category) === 1 ||
        Number(item.category) === 2
          ? 'bg-red-100 text-red-700'
          : Number(item.category) === 3
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-200 text-gray-700'
      }`}
    >
      Cat {item.category}
    </span>
  </div>

  {/* Status */}
  <div className="flex justify-between items-center">
    <span>Status</span>

    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${
        !item.acknowledged_at
          ? 'bg-red-100 text-red-600'
          : !item.vs_taken_at
          ? 'bg-orange-100 text-orange-600'
          : 'bg-green-100 text-green-600'
      }`}
    >
      {!item.acknowledged_at
        ? 'Pending Ack'
        : !item.vs_taken_at
        ? 'Pending VS'
        : 'In Observation'}
    </span>
  </div>
  {/* Diagnosis */}
<div className="flex justify-between items-center gap-3">
  <div className="flex items-center gap-2 text-[#0078AE]">
   <span className="text-gray-500">
      Dx
    </span>
     <span className="text-xs">
      ▲
    </span>
  </div>

  <span className="font-bold text-gray-900 text-right truncate max-w-[150px]">
    {item.diagnosis || '-'}
  </span>
</div>


</div>
</div>

                  {/* Handover Notes */}
<div className="p-4 md:p-5 flex flex-col gap-3 relative">
 <button
  onClick={(e) => {
    e.stopPropagation()
    setHideConfirmModal(item)
  }}
  className="absolute top-3 right-3 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 px-2.5 py-1 rounded-xl text-xs font-bold transition"
>
  Hide
</button>

  {/* Cubicle handover + remarks */}
<div
  className={`rounded-2xl p-3 min-h-[70px] border ${
     !hasHandover || allHandoverDone
      ? 'bg-white border-gray-200'
      : 'bg-yellow-50 border-yellow-100'
  }`}
>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

   {/* Cubicle Handover */}
<div>
  <p className="text-1xl font-bold text-yellow-700 mb-2">
    Cubicle Handover
  </p>

  {item.nursing_handover ? (
    <div className="flex flex-wrap gap-2">
      {item.nursing_handover
        .split(',')
        .map((tag, index) => {
          const text = tag.trim()
          const done = item.handover_done?.[text]

          return (
            <button
  key={index}
  onClick={(e) => {
  e.stopPropagation()
  openObservationDetail(item)
}}
  className={`px-4 md:px-5 py-2 rounded-2xl text-sm md:text-lg font-bold flex items-center gap-2 ${
    done
      ? 'bg-green-100 text-green-700'
      : 'bg-yellow-100 text-yellow-700'
  }`}
>
  <span>{text}</span>

  {done && (
    <span className="text-green-600 text-xl">
      ✓
    </span>
  )}

  {text === 'CTB' && done && !item.handover_done?.CTB_report_reviewed && (
    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-xl text-xs font-bold">
      Await report
    </span>
  )}

  {text === 'CTB' && item.handover_done?.CTB_report_reviewed && (
    <span className="bg-blue-100 text-[#0078AE] px-2 py-0.5 rounded-xl text-xs font-bold">
      Report reviewed
    </span>
  )}
</button>
          )
        })}
    </div>
  ) : (
    <p className="text-sm text-gray-400">
      No cubicle handover
    </p>
  )}
</div>
{/* Remarks */}
<div>
  <p className="text-1xl font-bold text-yellow-700 mb-2">
    Remarks
  </p>

  <p className="text-1xl font-semibold text-gray-700 whitespace-pre-wrap">
    {item.remarks || '-'}
  </p>
</div>

  </div>
  {linkedPsyCase && (
  <div className="md:col-span-2 mt-3 pt-3 border-t border-yellow-100">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Psych Status */}
      <div>
        <p className="text-sm font-bold text-yellow-700 mb-2">
          Psych Status
        </p>

        <span
  className={`inline-flex px-3 py-1 rounded-xl text-xs font-bold ${
    linkedPsyCase.status === PSY_STATUS_COMPLETE
      ? 'bg-green-100 text-green-700'
      : linkedPsyCase.status === PSY_STATUS_AWAITING_PSYCH
      ? 'bg-blue-100 text-[#0078AE]'
      : 'bg-yellow-100 text-yellow-700'
  }`}
>
  {linkedPsyCase.status || PSY_STATUS_PENDING_DOCTOR}
</span>
      </div>

      {/* Psych Outcome */}
      <div>
        <p className="text-sm font-bold text-yellow-700 mb-2">
          Psych Outcome
        </p>

        {!linkedPsyCase.outcome_details?.type ? (
          <p className="text-sm font-semibold text-gray-700">
            -
          </p>
        ) : linkedPsyCase.outcome_details.type === 'Discharge' ? (
          <span className="inline-flex bg-green-100 text-green-700 px-3 py-1 rounded-xl text-xs font-bold">
            Discharge
          </span>
        ) : (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-2">
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-xs font-bold">
                Admission
              </span>

              {linkedPsyCase.outcome_details.admission_form && (
                <span className="bg-blue-100 text-[#0078AE] px-3 py-1 rounded-xl text-xs font-bold">
                  {linkedPsyCase.outcome_details.admission_form}
                </span>
              )}

              {linkedPsyCase.outcome_details.admission_form === 'F123' &&
  linkedPsyCase.outcome_details.judge && (
    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-xl text-xs font-bold">
      Judge
    </span>
  )}

              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-xl text-xs font-bold">
                Fax:{linkedPsyCase.outcome_details.fax_time || ''} /Reply:{linkedPsyCase.outcome_details.reply_time || ''}
              </span>
            </div>

            {(linkedPsyCase.outcome_details.hospital || linkedPsyCase.outcome_details.ward) && (
              <div>
                <span className="bg-blue-100 text-[#0078AE] px-3 py-1 rounded-xl text-xs font-bold inline-block">
                  {linkedPsyCase.outcome_details.hospital || ''}
                  {linkedPsyCase.outcome_details.ward
                    ? ` ${linkedPsyCase.outcome_details.ward}`
                    : ''}
                </span>
              </div>
            )}

            {linkedPsyCase.outcome_details.transport && (
              <div>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-xl text-xs font-bold inline-block">
                  {linkedPsyCase.outcome_details.transport}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
)}
</div>
  {/* Free text */}
  <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-3">
    <p className="text-xs font-bold text-gray-500 mb-2">
      Free Text
    </p>

    <textarea
  value={handoverNotes[item.id] || ''}
  onClick={(e) => e.stopPropagation()}
   onFocus={() => setIsEditingNote(true)}
  onBlur={() => setIsEditingNote(false)}
  onChange={(e) => {
    handleHandoverNoteChange(item.id, e.target.value)
  }}
  placeholder="Enter handover notes..."
  className="w-full min-h-[90px] resize-none outline-none text-sm md:text-base text-gray-700 placeholder:text-gray-400"
/>
<div className="mt-2 h-5 text-xs font-semibold">
  {saveStatus[item.id] === 'saving' && (
    <span className="text-gray-400">
      Saving...
    </span>
  )}

  {saveStatus[item.id] === 'saved' && (
    <span className="text-green-600">
      Saved ✓
    </span>
  )}

  {saveStatus[item.id] === 'error' && (
    <span className="text-red-600">
      Save failed
    </span>
  )}
</div>
  </div>

</div>
                </div>
                )
})}
            </div>

           <div className="order-1 md:order-2 grid grid-cols-1 sm:grid-cols-3 md:flex md:flex-col md:min-w-[320px] border-b md:border-b-0 md:border-t-0 border-gray-200">
  {['AOM', 'IVF', 'Stayovernight'].map((title) => {
    const list =
  title === 'AOM'
    ? aomCases
    : title === 'IVF'
    ? ivfCases
    : title === 'Stayovernight'
    ? stayOvernightCases
    : []

    return (
      <div
        key={title}
       className="border-b sm:border-r md:border-r-0 border-gray-200 p-4 md:p-6 relative overflow-hidden"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg md:text-2xl font-bold text-[#0078AE]">
            {title}
          </h2>

          <span className="bg-blue-100 text-[#0078AE] px-3 py-1 rounded-xl font-bold">
            {list.length}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {list.length === 0 ? (
            <p className="text-gray-400 text-sm md:text-base text-center mt-16">
              No items yet
            </p>
          ) : (
            list.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-[#0078AE] truncate"
              >
                Bed {item.bed_no}
              </div>
            ))
          )}
        </div>
      </div>
    )
  })}
</div>
            </div>

          </div>

) : (
<div className="bg-white rounded-[28px] md:rounded-[36px] shadow-sm border border-gray-200 overflow-hidden">

  {/* Header row */}
  <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] bg-gray-50 border-b border-gray-200">
    <div className="p-4 md:p-6 font-bold text-[#0078AE]">
      Case Card
    </div>

    <div className="p-4 md:p-6 font-bold text-gray-500 flex items-center justify-between">
      <div>
        <p>Psychiatric Handover Notes</p>
        <p className="text-sm font-normal text-gray-400 mt-1">
          Progress / Outcome / Miscellaneous
        </p>
      </div>

      <button
  onClick={() => setAddPsyCaseModal(true)}
  className="bg-[#0078AE] hover:bg-[#00638F] text-white px-4 md:px-5 py-2.5 md:py-3 rounded-2xl text-sm md:text-base font-bold flex items-center gap-2 shadow-md"
>
  <span className="text-xl leading-none">+</span>
  <span>Add case</span>
</button>
    </div>
  </div>

  {/* Case rows */}
  {psychiatricCases.length === 0 ? (
    <div className="p-10 text-center text-gray-400 font-bold">
      No psychiatric cases yet
    </div>
  ) : (
    psychiatricCases.map((item) => (
      <div
  key={item.id}
  onClick={() => openPsyEditModal(item)}
  className="grid grid-cols-1 md:grid-cols-[260px_1fr] border-b-4 border-gray-300 hover:bg-gray-50 transition cursor-pointer bg-white"
>
        {/* Case Card */}
        <div className="p-4 md:p-5 md:border-r border-gray-100 bg-gray-50 md:bg-white">
          <div className="inline-flex px-3 py-2 rounded-2xl bg-blue-100 text-[#0078AE] font-bold mb-3">
           {item.bed_no
  ? `Bed ${item.bed_no}`
  : item.patient_label
  ? item.patient_label.toUpperCase()
  : 'Ambulatory Case'}
          </div>

          <div className="space-y-2 text-xs md:text-sm text-gray-500">
           <div className="flex justify-between items-center">
  <div className="flex items-center gap-2">
    {item.gender === 'M' ? (
      <>
        <Mars size={18} className="text-[#2F80ED]" />
        <span className="font-bold text-[#2F80ED]">M</span>
      </>
    ) : item.gender === 'F' ? (
      <>
        <Venus size={18} className="text-[#D94F70]" />
        <span className="font-bold text-[#D94F70]">F</span>
      </>
    ) : (
      <span className="font-bold text-gray-400">-</span>
    )}
  </div>

  <span className="font-bold text-gray-900">
    {item.age || '-'}
  </span>
</div>


            <div className="flex justify-between">
              <span>Location</span>
              <span className="font-bold text-gray-900 text-right">
                {item.location || '-'}
              </span>
            </div>


           <div className="flex justify-between items-center gap-2">
  <span className="shrink-0">Status</span>

  <span
    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold text-right whitespace-nowrap ${
      item.status === PSY_STATUS_COMPLETE
        ? 'bg-green-100 text-green-700'
        : item.status === PSY_STATUS_AWAITING_PSYCH
        ? 'bg-blue-100 text-[#0078AE]'
        : 'bg-yellow-100 text-yellow-700'
    }`}
  >
    {item.status === PSY_STATUS_PENDING_DOCTOR
      ? 'Pending Dr Consult'
      : item.status || PSY_STATUS_PENDING_DOCTOR}
  </span>
</div>
          </div>
        </div>

        {/* Psych Handover Notes */}
        <div className="p-4 md:p-5 flex flex-col gap-3 relative">
          <button
  type="button"
  onClick={(e) => {
    e.stopPropagation()
    setPsyHideConfirmModal(item)
  }}
  className="absolute top-3 right-3 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 px-2.5 py-1 rounded-xl text-[11px] md:text-xs font-bold transition"
>
  Hide
</button>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

  {/* Chief Complaint */}
  <div className="rounded-2xl p-3 min-h-[76px] md:min-h-[90px] border bg-gray-50 border-gray-200">
    <p className="text-1xl font-bold text-yellow-700 mb-2">
      Chief Complaint
    </p>

    <p className="text-1xl font-semibold text-gray-700 whitespace-pre-wrap">
      {item.chief_complaint || '-'}
    </p>
  </div>

  {/* Outcome */}
  <div className="rounded-2xl p-3 min-h-[76px] md:min-h-[90px] border bg-gray-50 border-gray-200">
    <p className="text-1xl font-bold text-yellow-700 mb-2">
      Outcome
    </p>

    <div className="space-y-2">
  {!item.outcome_details?.type ? (
    <p className="text-1xl font-semibold text-gray-700">
      -
    </p>
  ) : item.outcome_details.type === 'Discharge' ? (
    <p className="text-1xl font-bold text-green-700">
      Discharge
    </p>
  ) : (
    <>
      {/* Row 1 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-sm font-bold">
          Admission
        </span>

        {item.outcome_details.admission_form && (
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-sm font-bold">
            {item.outcome_details.admission_form}
          </span>
        )}

        {item.outcome_details.admission_form === 'F123' &&
  item.outcome_details.judge && (
    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-xl text-sm font-bold">
      Judge
    </span>
  )}

        {item.outcome_details.admission_form &&
  (item.outcome_details.fax_time || item.outcome_details.reply_time) && (
    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-xl text-sm font-bold">
      Fax:{item.outcome_details.fax_time || ''} /Reply:{item.outcome_details.reply_time || ''}
    </span>
  )}
      </div>

      {/* Row 2 */}
      {(item.outcome_details.hospital || item.outcome_details.ward) && (
        <div>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-sm font-bold inline-block">
            {item.outcome_details.hospital || ''}
            {item.outcome_details.ward ? ` ${item.outcome_details.ward}` : ''}
          </span>
        </div>
      )}

      {/* Row 3 */}
      {item.outcome_details.transport && (
        <div>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-sm font-bold inline-block">
            {item.outcome_details.transport}
          </span>
        </div>
      )}
    </>
  )}
</div>
  </div>

</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
           <div className="bg-white border border-gray-200 rounded-2xl p-3">
  <p className="text-xs font-bold text-gray-500 mb-2">
    Monitoring
  </p>

  <div className="flex flex-wrap gap-2">
    {!item.monitoring_checks?.Security &&
    !item.monitoring_checks?.Restraint &&
    !item.monitoring_checks?.['Tracking tag'] ? (
      <p className="text-gray-400 text-sm">-</p>
    ) : (
      <>
        {item.monitoring_checks?.Security && (
          <span className="bg-blue-100 text-[#0078AE] px-3 py-1 rounded-xl text-sm font-bold">
            Security ✓
          </span>
        )}

        {item.monitoring_checks?.Restraint && (
          <span className="bg-blue-100 text-[#0078AE] px-3 py-1 rounded-xl text-sm font-bold">
            Restraint
            {item.monitoring_checks?.restraint_type
              ? `: ${item.monitoring_checks.restraint_type}`
              : ''}
            {' '}✓
          </span>
        )}

        {item.monitoring_checks?.['Tracking tag'] && (
          <span className="bg-blue-100 text-[#0078AE] px-3 py-1 rounded-xl text-sm font-bold">
            Tracking tag
            {item.monitoring_checks?.tracking_tag_no
              ? `: ${item.monitoring_checks.tracking_tag_no}`
              : ''}
            {' '}✓
          </span>
        )}
      </>
    )}
  </div>
</div>

           <div className="bg-white border border-gray-200 rounded-2xl p-3">
  <p className="text-xs font-bold text-gray-500 mb-2">
    Miscellaneous
  </p>

  <div className="flex flex-wrap gap-2">
    {!item.miscellaneous_checks?.Belongings &&
    !item.miscellaneous_checks?.['Meal ordering'] &&
    !item.miscellaneous_checks?.Medication &&
    !item.miscellaneous_checks?.Others ? (
      <p className="text-gray-400 text-sm">-</p>
    ) : (
      <>
        {item.miscellaneous_checks?.Belongings && (
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-xl text-sm font-bold">
            Belongings
            {item.miscellaneous_checks?.belongings_location
              ? `: ${item.miscellaneous_checks.belongings_location}`
              : ''}
            {' '}✓
          </span>
        )}

        {item.miscellaneous_checks?.['Meal ordering'] && (
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-xl text-sm font-bold">
            Meal ordering ✓
          </span>
        )}

        {item.miscellaneous_checks?.Medication && (
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-xl text-sm font-bold">
            Medication ✓
          </span>
        )}

        {item.miscellaneous_checks?.Others && (
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-xl text-sm font-bold">
            Others
            {item.miscellaneous_checks?.others_text
              ? `: ${item.miscellaneous_checks.others_text}`
              : ''}
            {' '}✓
          </span>
        )}
      </>
    )}
  </div>
</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-3">
            <p className="text-xs font-bold text-gray-500 mb-2">
              Free Text
            </p>
            <textarea
  value={psyFreeTextNotes[item.id] || ''}
  onClick={(e) => e.stopPropagation()}
  onFocus={() => setIsEditingNote(true)}
  onBlur={() => setIsEditingNote(false)}
  onChange={(e) => {
    handlePsyFreeTextChange(item.id, e.target.value)
  }}
  placeholder="Enter psychiatric handover notes..."
  className="w-full min-h-[70px] md:min-h-[90px] resize-none outline-none text-sm md:text-base text-gray-700 placeholder:text-gray-400 bg-transparent"
/>

<div className="mt-2 h-5 text-xs font-semibold">
  {psyFreeTextSaveStatus[item.id] === 'saving' && (
    <span className="text-gray-400">
      Saving...
    </span>
  )}

  {psyFreeTextSaveStatus[item.id] === 'saved' && (
    <span className="text-green-600">
      Saved ✓
    </span>
  )}

  {psyFreeTextSaveStatus[item.id] === 'error' && (
    <span className="text-red-600">
      Save failed
    </span>
  )}
</div>
          </div>
        </div>
      </div>
    ))
  )}
</div>
)}

{detailModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
    onClick={() => setDetailModal(null)}
  >
    <div
      className="bg-white rounded-3xl p-8 w-[90vw] max-w-[520px] shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[#0078AE]">
          Bed {detailModal.bed_no}
        </h2>

        <button
          onClick={() => setDetailModal(null)}
          className="text-4xl font-bold text-gray-400 hover:text-black"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-500">Gender</span>
          <span className="font-bold">{detailModal.gender}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Age</span>
          <span className="font-bold">{detailModal.age}</span>
        </div>

        <div className="flex justify-between">
  <span className="text-gray-500">Category</span>
  <span className="font-bold">Cat {detailModal.category}</span>
</div>

<div className="flex justify-between items-center gap-4">
  <div className="flex items-center gap-2 text-gray-500">
    <span>Dx</span>
    <span className="text-[#0078AE] text-xs">▲</span>
  </div>

  <span className="font-bold text-right">
    {detailModal.diagnosis || '-'}
  </span>
</div>

<div className="flex justify-between">
  <span className="text-gray-500">Remarks</span>
  <span className="font-bold text-right">
    {detailModal.remarks || '-'}
  </span>
</div>

        {detailModal.nursing_handover &&
  detailModal.nursing_handover.trim() !== '' && (
    <div>
      <p className="text-gray-500 mb-3 font-semibold">
        Handover Checklist
      </p>

      <div className="space-y-3">
        {detailModal.nursing_handover
          .split(',')
          .map((tag, index) => {
            const text = tag.trim()
            const isCTB = text === 'CTB'

            if (!text) return null

            return (
              <div key={index} className="space-y-2">
                <label className="flex items-center gap-3 text-lg">
                  <input
                    type="checkbox"
                    checked={handoverChecks[text] || false}
                    onChange={(e) => {
                      const checked = e.target.checked

                      setHandoverChecks((prev) => ({
                        ...prev,
                        [text]: checked,

                        ...(isCTB && !checked
                          ? { CTB_report_reviewed: false }
                          : {})
                      }))
                    }}
                    className="w-5 h-5"
                  />

                  <span>{text}</span>
                </label>

                {isCTB && handoverChecks.CTB && (
                  <label className="ml-8 flex items-center gap-3 text-base bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                    <input
                      type="checkbox"
                      checked={handoverChecks.CTB_report_reviewed || false}
                      onChange={(e) => {
                        setHandoverChecks((prev) => ({
                          ...prev,
                          CTB_report_reviewed: e.target.checked
                        }))
                      }}
                      className="w-5 h-5"
                    />

                    <span className="font-semibold text-gray-700">
                      Report reviewed
                    </span>
                  </label>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )}

        {detailModal.nursing_handover &&
  detailModal.nursing_handover.trim() !== '' && (
    <button
      onClick={async () => {
        await supabase
          .from('observation_cases')
          .update({
            handover_done: handoverChecks
          })
          .eq('id', detailModal.id)

        setDetailModal(null)
        fetchCases()
      }}
      className="w-full mt-6 bg-[#0078AE] text-white py-4 rounded-2xl font-bold hover:bg-[#00638F]"
    >
      Save Checklist
    </button>
  )}
      </div>
    </div>
  </div>
)}
{hideConfirmModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
    onClick={() => setHideConfirmModal(null)}
  >
    <div
      className="bg-white rounded-3xl p-8 w-[90vw] max-w-[420px] shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Hide from Handover?
        </h2>

        <p className="text-gray-500">
          Bed {hideConfirmModal.bed_no} will be removed from the Handover page.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6">
        <p className="text-sm text-gray-500 mb-1">
          This will not delete the patient record.
        </p>

        <p className="text-sm text-gray-500">
          Dashboard and History data will remain unchanged.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setHideConfirmModal(null)}
          className="py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
        >
          Cancel
        </button>

        <button
          onClick={() => hideFromHandover(hideConfirmModal.id)}
          className="py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600"
        >
          Confirm Hide
        </button>
      </div>
    </div>
  </div>
)}

{psyHideConfirmModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] px-4"
    onClick={() => setPsyHideConfirmModal(null)}
  >
    <div
      className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-[440px] shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Hide Psychiatric Case?
        </h2>

        <p className="text-gray-500">
          This case will be removed from the Psychiatric Handover page.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 space-y-2">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">
            Case
          </span>

          <span className="font-bold text-right">
            {psyHideConfirmModal.bed_no
              ? `Bed ${psyHideConfirmModal.bed_no}`
              : psyHideConfirmModal.patient_label ||
                'Psychiatric Case'}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-gray-500">
            Location
          </span>

          <span className="font-bold text-right">
            {psyHideConfirmModal.location || '-'}
          </span>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
        <p className="text-sm text-yellow-800 font-semibold">
          This will not discharge the patient or delete the record.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setPsyHideConfirmModal(null)}
          className="py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() =>
            hidePsyFromHandover(psyHideConfirmModal.id)
          }
          className="py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600"
        >
          Confirm Hide
        </button>
      </div>
    </div>
  </div>
)}

{addHandoverModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
    onClick={() => setAddHandoverModal(false)}
  >
    <div
      className="bg-white rounded-3xl p-8 w-[90vw] max-w-[520px] shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0078AE]">
            Add to Handover
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            Select a bed to add manually
          </p>
        </div>

        <button
          onClick={() => setAddHandoverModal(false)}
          className="text-4xl font-bold text-gray-400 hover:text-black"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto">
        {addableHandoverCases.length === 0 ? (
          <p className="col-span-4 text-center text-gray-400 py-10">
            No available cases
          </p>
        ) : (
          addableHandoverCases.map((item) => (
            <button
              key={item.id}
              onClick={() => addToHandover(item.id)}
              className="bg-blue-50 hover:bg-blue-100 border border-blue-100 text-[#0078AE] rounded-2xl py-4 font-bold"
            >
              Bed {item.bed_no}
            </button>
          ))
        )}
      </div>
    </div>
  </div>
)}
{addPsyCaseModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
   onClick={() => {
  setAddPsyCaseModal(false)
  resetPsyForm()
}}
  >
    <div
      className="bg-white rounded-3xl p-6 md:p-8 w-[92vw] max-w-[560px] shadow-2xl max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#0078AE]">
            Add Psychiatric Case
          </h2>

          <p className="text-gray-500 mt-1">
            Add from Observation Room or create manually
          </p>
        </div>

        <button
  onClick={() => {
    setAddPsyCaseModal(false)
    resetPsyForm()
  }}
  className="text-4xl font-bold text-gray-400 hover:text-black leading-none"
>
  ×
</button>
      </div>

      <div className="space-y-5">

  {/* Select Observation Room patient */}
  <div>
    <label className="block font-bold mb-2 text-gray-700">
      From Observation Room/ Manual 
    </label>

    <select
      value={selectedObservationCaseId}
      onChange={(e) =>
        handleSelectObservationCase(e.target.value)
      }
      className="w-full border border-gray-300 rounded-2xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-[#0078AE]"
    >
      <option value="">
        Ambulatory Case
      </option>

      {selectableObservationCases.map((item) => (
        <option
          key={item.id}
          value={item.id}
        >
          Bed {item.bed_no} · {item.gender || '-'} · Age {item.age || '-'}
        </option>
      ))}
    </select>

    {selectedObservationCaseId && (
      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-[#0078AE] font-semibold">
        Linked to Observation Room patient
      </div>
    )}
  </div>

  {/* AE Reference */}
<div>
  <label className="block font-bold mb-2 text-gray-700">
    AE Reference
  </label>

  {selectedObservationCaseId ? (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
      <p className="text-sm font-semibold text-[#0078AE]">
        Linked AE reference
      </p>

      <p className="mt-1 text-xl font-bold tracking-wider text-gray-900">
        {psyAeSuffix
          ? `AE•••••${psyAeSuffix}`
          : 'No AE reference found'}
      </p>
    </div>
  ) : psyAeSuffix ? (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-green-700">
            AE barcode scanned
          </p>

          <p className="mt-1 text-xl font-bold tracking-wider text-gray-900">
            AE•••••{psyAeSuffix}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPsyAeSuffix('')
            setPsyAeScanMessage('')
            setShowPsyAeScanner(true)
          }}
          className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#0078AE] shadow-sm"
        >
          Scan Again
        </button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => {
        setPsyAeScanMessage('')
        setShowPsyAeScanner(true)
      }}
      className="w-full rounded-2xl border-2 border-[#0078AE] bg-white px-4 py-4 font-bold text-[#0078AE] hover:bg-blue-50"
    >
      Scan AE Barcode
    </button>
  )}

  {!selectedObservationCaseId && (
    <p className="mt-2 text-sm text-gray-500">
      Only the last 5 characters of the AE number are retained.
    </p>
  )}
</div>

        {/* Gender */}
        <div>
          <label className="block font-bold mb-2 text-gray-700">
            Gender
          </label>

          <div className="grid grid-cols-2 gap-3">
           {['M', 'F'].map((value) => (
  <button
    key={value}
    type="button"
    disabled={!!selectedObservationCaseId}
    onClick={() => setPsyGender(value)}
    className={`py-4 rounded-2xl text-xl font-bold transition disabled:cursor-not-allowed ${
      psyGender === value
        ? 'text-white'
        : 'bg-gray-200 text-gray-700'
    } ${
      selectedObservationCaseId
        ? 'opacity-60'
        : ''
    }`}
    style={{
      backgroundColor:
        psyGender === value
          ? value === 'M'
            ? '#245C8F'
            : '#B14E6A'
          : undefined
    }}
  >
    {value}
  </button>
))}
          </div>
        </div>

        {/* Age */}
        <div>
          <label className="block font-bold mb-2 text-gray-700">
            Age
          </label>

          <input
  value={psyAge}
  onChange={(e) => setPsyAge(e.target.value)}
  type="number"
  disabled={!!selectedObservationCaseId}
  placeholder="Age"
  className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0078AE] disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
/>
        </div>

        {/* Chief Complaint */}
{selectedObservationCaseId ? (
  <div>
    <label className="block font-bold mb-2 text-gray-700">
      Chief Complaint
    </label>

    <div className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3 text-gray-700 font-semibold">
      {psyChiefComplaint || '-'}
    </div>
  </div>
) : (
  <div>
    <label className="block font-bold mb-2 text-gray-700">
      Chief Complaint
    </label>

    <textarea
      value={psyChiefComplaint}
      onChange={(e) => setPsyChiefComplaint(e.target.value)}
      placeholder="e.g. suicidal ideation / aggression / psychosis"
      rows={3}
      className="w-full border border-gray-300 rounded-2xl px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-[#0078AE]"
    />
  </div>
)}

       {/* Location */}
{selectedObservationCaseId ? (
  <div>
    <label className="block font-bold mb-2 text-gray-700">
      Location
    </label>

    <div className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3 text-gray-700 font-semibold">
      Observation Room
    </div>
  </div>
) : (
  <div>
    <label className="block font-bold mb-2 text-gray-700">
      Location
    </label>

    <input
      value={psyLocation}
      onChange={(e) => setPsyLocation(e.target.value)}
      placeholder="e.g. Triage / WR / Consult Room / Police Room"
      className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0078AE]"
    />
  </div>
)}

       <button
  type="button"
  onClick={handleAddPsyCase}
  className="bg-[#0078AE] hover:bg-[#00638F] text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-md"
>
  + Add Case
</button>
      </div>
    </div>
  </div>
)}

{showPsyAeScanner && (
  <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/70 p-4">
    <div className="w-full max-w-[560px] rounded-3xl bg-white p-5 shadow-2xl md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Scan AE Barcode
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Point the rear camera at the patient's AE barcode
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowPsyAeScanner(false)
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-2xl font-bold text-gray-600"
        >
          ×
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl bg-black">
        <div
          id="psy-ae-reader"
          className="min-h-[320px] w-full"
        />
      </div>

      {psyAeScanMessage && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {psyAeScanMessage}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setShowPsyAeScanner(false)
        }}
        className="mt-5 w-full rounded-2xl bg-gray-100 px-4 py-4 font-bold text-gray-700"
      >
        Cancel
      </button>
    </div>
  </div>
)}

{psyEditModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
    onClick={() => setPsyEditModal(null)}
  >
    <div
      className="bg-white rounded-3xl p-6 md:p-8 w-[92vw] max-w-[620px] shadow-2xl max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#0078AE]">
            Edit Psychiatric Handover
          </h2>

          <p className="text-gray-500 mt-1">
            {psyEditModal.patient_label || `Bed ${psyEditModal.bed_no}`}
          </p>
        </div>

        <button
          onClick={() => setPsyEditModal(null)}
          className="text-4xl font-bold text-gray-400 hover:text-black leading-none"
        >
          ×
        </button>
      </div>

      <div className="space-y-6">
        {/* Status */}
        <div>
          <label className="block font-bold mb-3 text-gray-700">
            Status
          </label>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
         {[
  {
    value: PSY_STATUS_PENDING_DOCTOR,
    label: 'Pending Doctor Consultation'
  },
  {
    value: PSY_STATUS_AWAITING_PSYCH,
    label: 'Awaiting Psych Review'
  },
  {
    value: PSY_STATUS_COMPLETE,
    label: 'Complete'
  }
].map((option) => (
  <button
    key={option.value}
    type="button"
    onClick={() => setPsyEditStatus(option.value)}
    className={`py-4 rounded-2xl font-bold transition ${
      psyEditStatus === option.value
        ? 'bg-[#0078AE] text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
  >
    {option.label}
  </button>
))}
          </div>
        </div>

       {/* Outcome only if complete */}
{psyEditStatus === PSY_STATUS_COMPLETE && (
  <div className="space-y-4">
    <label className="block font-bold text-gray-700">
      Outcome
    </label>

    {/* Admission / Discharge */}
    <div className="grid grid-cols-2 gap-3">
     {['Admission', 'Discharge'].map((value) => (
  <button
    key={value}
    type="button"
    disabled={isPsyDischarging}
    onClick={() => {
      if (value === 'Discharge') {
  setPsyDischargeConfirmModal(psyEditModal)
  return
}

      setPsyOutcomeType('Admission')
    }}
    className={`py-4 rounded-2xl font-bold transition disabled:opacity-50 ${
      value === 'Discharge'
        ? 'bg-red-500 hover:bg-red-600 text-white'
        : psyOutcomeType === 'Admission'
        ? 'bg-[#0078AE] text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
  >
    {value === 'Discharge' && isPsyDischarging
      ? 'Discharging...'
      : value}
  </button>
))}
    </div>

    {psyOutcomeType === 'Admission' && (
      <div className="space-y-4">
        {/* Vol form / F123 */}
        <div className="grid grid-cols-2 gap-3">
          {['Vol. form', 'F123'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
  setPsyAdmissionForm(value)

  if (value !== 'F123') {
    setPsyJudge(false)
  }
}}
              className={`py-3 rounded-2xl font-bold transition ${
                psyAdmissionForm === value
                  ? 'bg-[#0078AE] text-white'
                  : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {psyAdmissionForm === 'F123' && (
  <label className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
    <input
      type="checkbox"
      checked={psyJudge}
      onChange={(e) => setPsyJudge(e.target.checked)}
      className="w-5 h-5"
    />

    <span className="font-semibold text-gray-700">
      Judge
    </span>
  </label>
)}

        {/* Hospital + Ward */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={psyHospital}
            onChange={(e) => setPsyHospital(e.target.value)}
            placeholder="Hospital"
            className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0078AE]"
          />

          <input
            value={psyWard}
            onChange={(e) => setPsyWard(e.target.value)}
            placeholder="Ward"
            className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0078AE]"
          />
        </div>

       {psyAdmissionForm && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <input
      value={psyFaxTime}
      onChange={(e) => setPsyFaxTime(e.target.value)}
      placeholder="Fax time"
      className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0078AE]"
    />

    <input
      value={psyReplyTime}
      onChange={(e) => setPsyReplyTime(e.target.value)}
      placeholder="Reply time"
      className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0078AE]"
    />
  </div>
)}

        {/* P1 / P2 / St.John */}
        <div className="grid grid-cols-3 gap-3">
          {['P1', 'P2', 'St.John'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPsyTransport(value)}
              className={`py-3 rounded-2xl font-bold transition ${
                psyTransport === value
                  ? 'bg-[#0078AE] text-white'
                  : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
)}

        {/* Monitoring */}
        <div>
          <label className="block font-bold mb-3 text-gray-700">
            Monitoring
          </label>

          <div className="space-y-3">
{[
  'Security',
  'Restraint',
  'Tracking tag'
].map((label) => (
  <div
    key={label}
    className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"
  >
    <label className="flex items-center gap-3 font-semibold">
      <input
        type="checkbox"
        checked={psyMonitoringChecks[label] || false}
        onChange={(e) => {
          const checked = e.target.checked

          setPsyMonitoringChecks((prev) => ({
            ...prev,
            [label]: checked,
            ...(label === 'Restraint' && !checked
              ? { restraint_type: '' }
              : {}),
            ...(label === 'Tracking tag' && !checked
              ? { tracking_tag_no: '' }
              : {})
          }))
        }}
        className="w-5 h-5"
      />

      <span>{label}</span>
    </label>

    {label === 'Restraint' && psyMonitoringChecks.Restraint && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {['Physical restraint', 'Chemical restraint'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() =>
              setPsyMonitoringChecks((prev) => ({
                ...prev,
                restraint_type: type
              }))
            }
            className={`px-4 py-3 rounded-2xl font-bold transition ${
              psyMonitoringChecks.restraint_type === type
                ? 'bg-[#0078AE] text-white'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    )}

    {label === 'Tracking tag' && psyMonitoringChecks['Tracking tag'] && (
      <div className="mt-4">
        <input
          value={psyMonitoringChecks.tracking_tag_no || ''}
          onChange={(e) =>
            setPsyMonitoringChecks((prev) => ({
              ...prev,
              tracking_tag_no: e.target.value
            }))
          }
          placeholder="Enter tracking tag number"
          className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0078AE]"
        />
      </div>
    )}
  </div>
))}
          </div>
        </div>

        {/* Miscellaneous */}
<div>
  <label className="block font-bold mb-3 text-gray-700">
    Miscellaneous
  </label>

  <div className="space-y-3">
    {[
      'Belongings',
      'Meal ordering',
      'Medication',
      'Others'
    ].map((label) => (
      <div
        key={label}
        className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"
      >
        <label className="flex items-center gap-3 font-semibold">
          <input
            type="checkbox"
            checked={psyMiscChecks[label] || false}
            onChange={(e) => {
              const checked = e.target.checked

              setPsyMiscChecks((prev) => ({
                ...prev,
                [label]: checked,

                ...(label === 'Belongings' && !checked
                  ? { belongings_location: '' }
                  : {}),

                ...(label === 'Others' && !checked
                  ? { others_text: '' }
                  : {})
              }))
            }}
            className="w-5 h-5"
          />

          <span>{label}</span>
        </label>

        {label === 'Belongings' && psyMiscChecks.Belongings && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {['Nurse station', 'Police', 'Safe box', 'Companion'].map((location) => (
              <button
                key={location}
                type="button"
                onClick={() =>
                  setPsyMiscChecks((prev) => ({
                    ...prev,
                    belongings_location: location
                  }))
                }
                className={`px-3 py-3 rounded-2xl font-bold transition ${
                  psyMiscChecks.belongings_location === location
                    ? 'bg-[#0078AE] text-white'
                    : 'bg-white border border-gray-300 text-gray-700'
                }`}
              >
                {location}
              </button>
            ))}
          </div>
        )}

        {label === 'Others' && psyMiscChecks.Others && (
          <div className="mt-4">
            <textarea
              value={psyMiscChecks.others_text || ''}
              onChange={(e) =>
                setPsyMiscChecks((prev) => ({
                  ...prev,
                  others_text: e.target.value
                }))
              }
              placeholder="Enter other miscellaneous notes..."
              rows={3}
              className="w-full border border-gray-300 rounded-2xl px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-[#0078AE]"
            />
          </div>
        )}
      </div>
    ))}
  </div>
</div>

        <button
          onClick={savePsyChecklist}
          className="w-full bg-[#0078AE] hover:bg-[#00638F] text-white py-4 rounded-2xl font-bold text-lg"
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}

{psyDischargeConfirmModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] px-4"
    onClick={() => {
      if (!isPsyDischarging) {
        setPsyDischargeConfirmModal(null)
      }
    }}
  >
    <div
      className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-[440px] shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-red-600 mb-2">
          Confirm Discharge
        </h2>

        <p className="text-gray-600">
          Are you sure you want to discharge this psychiatric case?
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 space-y-2">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">
            Case
          </span>

          <span className="font-bold text-right">
            {psyDischargeConfirmModal.patient_label ||
              (psyDischargeConfirmModal.bed_no
                ? `Bed ${psyDischargeConfirmModal.bed_no}`
                : 'Psychiatric Case')}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-gray-500">
            Location
          </span>

          <span className="font-bold text-right">
            {psyDischargeConfirmModal.location || '-'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isPsyDischarging}
          onClick={() => setPsyDischargeConfirmModal(null)}
          className="py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={isPsyDischarging}
          onClick={confirmDischargePsyCase}
          className="py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-50"
        >
          {isPsyDischarging
            ? 'Discharging...'
            : 'Confirm Discharge'}
        </button>
      </div>
    </div>
  </div>
)}

     <BottomNav />
    </main>
  )
}