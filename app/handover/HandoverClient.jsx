'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Bell, Mars, Venus } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import StaffHeaderInfo from '../components/StaffHeaderInfo'
import { useStaff } from '../components/StaffProvider'
import { writeAuditLog } from '@/lib/auditLog'

const CT_STATUS = {
  PENDING: 'pending_ct',
  AWAIT_REPORT: 'await_report',
  COMPLETED: 'completed'
}

function isCTTag(text) {
  const normalized = String(text || '').trim().toUpperCase()
  return normalized === 'CT' || normalized === 'CTB'
}

function normalizeCTStatus(status) {
  if (status === CT_STATUS.AWAIT_REPORT) return CT_STATUS.AWAIT_REPORT
  if (status === CT_STATUS.COMPLETED) return CT_STATUS.COMPLETED
  return CT_STATUS.PENDING
}

function getCTStatusMeta(status) {
  const normalized = normalizeCTStatus(status)

  if (normalized === CT_STATUS.AWAIT_REPORT) {
    return {
      label: 'Await Report',
      tagClass: 'bg-orange-50 text-orange-700',
      badgeClass: 'bg-orange-100 text-orange-700',
      borderClass: 'border-orange-200'
    }
  }

  if (normalized === CT_STATUS.COMPLETED) {
    return {
      label: 'Report Reviewed',
      tagClass: 'bg-green-100 text-green-700',
      badgeClass: 'bg-green-200 text-green-800',
      borderClass: 'border-green-200'
    }
  }

  return {
    label: 'Pending CT',
    tagClass: 'bg-red-50 text-red-700',
    badgeClass: 'bg-red-100 text-red-700',
    borderClass: 'border-red-200'
  }
}

function CTStatusBadge({ status, compact = false }) {
  const meta = getCTStatusMeta(status)

  return (
    <span
      className={`rounded-xl font-bold ${meta.badgeClass} ${
        compact
          ? 'px-2 py-0.5 text-[10px]'
          : 'px-2.5 py-1 text-xs'
      }`}
    >
      {meta.label}
    </span>
  )
}

function getPsyActionLabel(actionType) {
  const labels = {
    PSY_CASE_CREATED:
      'Case added',

    PSY_HANDOVER_UPDATED:
      'Handover updated',

    PSY_FREE_TEXT_UPDATED:
      'Free text updated',

    PSY_CASE_HIDDEN:
      'Case hidden',

    PSY_CASE_DISCHARGED:
      'Case discharged'
  }

  return labels[actionType] || 'Case updated'
}



function getObservationActionLabel(actionType) {
  const labels = {
    OBS_CASE_CREATED:
  'Case created',

    OBS_HANDOVER_CHECKLIST_UPDATED:
      'Checklist updated',

    OBS_HANDOVER_FREE_TEXT_UPDATED:
      'Free text updated',

    OBS_CT_STATUS_UPDATED:
      'CT status updated',

    OBS_HANDOVER_AND_CT_UPDATED:
      'Checklist and CT status updated',

    OBS_HANDOVER_ADDED:
      'Added to handover',

    OBS_HANDOVER_HIDDEN:
      'Hidden from handover'

    
  }

  return labels[actionType] || 'Handover updated'
}

function getUnifiedActionLabel(actionType) {
  if (
    String(actionType || '').startsWith('PSY_')
  ) {
    return getPsyActionLabel(actionType)
  }

  if (
    String(actionType || '').startsWith('OBS_')
  ) {
    return getObservationActionLabel(actionType)
  }

  return 'Case updated'
}

function getObservationActionDetails(log) {
  const oldData = log.old_data || {}
  const newData = log.new_data || {}

  if (
  log.action_type ===
  'OBS_CASE_CREATED'
) {
  return {
    before: null,

    after: [
      `Bed: ${newData.bed_no || '-'}`,
      `Category: Cat ${newData.category || '-'}`,
      `Diagnosis: ${newData.diagnosis || '-'}`,
      `Handover: ${newData.nursing_handover || '-'}`,
      `CT: ${
        newData.ct_status
          ? getCTStatusMeta(
              newData.ct_status
            ).label
          : 'Not required'
      }`
    ].join('\n')
  }
}

  if (
    log.action_type ===
    'OBS_HANDOVER_FREE_TEXT_UPDATED'
  ) {
    return {
      before:
        oldData.handover_note || '-',

      after:
        newData.handover_note || '-'
    }
  }

  if (
    log.action_type ===
    'OBS_CT_STATUS_UPDATED'
  ) {
    return {
      before:
        getCTStatusMeta(
          oldData.ct_status
        ).label,

      after:
        getCTStatusMeta(
          newData.ct_status
        ).label
    }
  }

  if (
    log.action_type ===
    'OBS_HANDOVER_CHECKLIST_UPDATED'
  ) {
    return {
      before:
        formatChecklistHistory(
          oldData.handover_done
        ),

      after:
        formatChecklistHistory(
          newData.handover_done
        )
    }
  }

  if (
    log.action_type ===
    'OBS_HANDOVER_AND_CT_UPDATED'
  ) {
    return {
      before:
        `Checklist: ${formatChecklistHistory(
          oldData.handover_done
        )}\nCT: ${
          getCTStatusMeta(
            oldData.ct_status
          ).label
        }`,

      after:
        `Checklist: ${formatChecklistHistory(
          newData.handover_done
        )}\nCT: ${
          getCTStatusMeta(
            newData.ct_status
          ).label
        }`
    }
  }

  if (
    log.action_type ===
    'OBS_HANDOVER_ADDED'
  ) {
    return {
      before: null,
      after: 'Added to handover'
    }
  }

  if (
    log.action_type ===
    'OBS_HANDOVER_HIDDEN'
  ) {
    return {
      before: 'Visible',
      after: 'Hidden'
    }
  }

  return {
    before: null,
    after: null
  }
}

function formatChecklistHistory(checklist) {
  if (!checklist) return '-'

  const completedItems =
    Object.entries(checklist)
      .filter(([, value]) => value === true)
      .map(([key]) => key)

  return completedItems.length > 0
    ? completedItems.join(', ')
    : '-'
}

function getPsyActionDetails(log) {
  const oldData = log.old_data || {}
  const newData = log.new_data || {}

  if (
    log.action_type ===
    'PSY_FREE_TEXT_UPDATED'
  ) {
    return {
      oldValue:
        oldData.free_text || '-',
      newValue:
        newData.free_text || '-'
    }
  }

  if (
    log.action_type ===
    'PSY_HANDOVER_UPDATED'
  ) {
    return {
      oldValue:
        oldData.status || '-',
      newValue:
        newData.status || '-'
    }
  }

  if (
    log.action_type ===
    'PSY_CASE_CREATED'
  ) {
    return {
      oldValue: null,
      newValue:
        'Psychiatric case created'
    }
  }

  if (
    log.action_type ===
    'PSY_CASE_HIDDEN'
  ) {
    return {
      oldValue: 'Visible',
      newValue: 'Hidden'
    }
  }

  if (
    log.action_type ===
    'PSY_CASE_DISCHARGED'
  ) {
    return {
      oldValue:
        oldData.status || '-',
      newValue: 'Discharged'
    }
  }

  return {
    oldValue: null,
    newValue: null
  }
}

function getUnifiedActionDetails(log) {
  if (
    String(log.action_type || '').startsWith(
      'PSY_'
    )
  ) {
    const psyDetails =
      getPsyActionDetails(log)

    return {
      before:
        psyDetails.oldValue,

      after:
        psyDetails.newValue
    }
  }

  if (
    String(log.action_type || '').startsWith(
      'OBS_'
    )
  ) {
    return getObservationActionDetails(log)
  }

  return {
    before: null,
    after: null
  }
}

function formatLastUpdatedTime(timestamp) {
  if (!timestamp) return ''

  return new Date(timestamp).toLocaleString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }
  )
}

export default function HandoverPage({
  initialTab = 'observation'
}) {

  const {
  currentStaff,
  staffLoading
} = useStaff()
  const [cases, setCases] = useState([])
  const [handoverNotes, setHandoverNotes] = useState({})
const saveTimers = useRef({})
const [saveStatus, setSaveStatus] = useState({})
const [isEditingNote, setIsEditingNote] = useState(false)
  const [detailModal, setDetailModal] = useState(null)
const [handoverChecks, setHandoverChecks] = useState({})

const [
  observationHistoryModal,
  setObservationHistoryModal
] = useState(null)

const [
  observationHistoryLogs,
  setObservationHistoryLogs
] = useState([])

const [
  observationHistoryLoading,
  setObservationHistoryLoading
] = useState(false)

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

const [psyHistoryModal, setPsyHistoryModal] = useState(null)
const [psyHistoryLogs, setPsyHistoryLogs] = useState([])
const [psyHistoryLoading, setPsyHistoryLoading] = useState(false)

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
const [
  handoverNotificationModal,
  setHandoverNotificationModal
] = useState(false)

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
  setDetailModal({
    ...item,
    original_ct_status:
      normalizeCTStatus(item.ct_status)
  })

  setHandoverChecks(
    item.handover_done || {}
  )
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

async function openObservationHistory(item) {
  setObservationHistoryModal(item)
  setObservationHistoryLogs([])
  setObservationHistoryLoading(true)

  const { data, error } = await supabase.rpc(
    'get_observation_case_audit_history',
    {
      p_case_id: String(item.id)
    }
  )

  if (error) {
    console.error(
      'Load observation history error:',
      error
    )

    setObservationHistoryLoading(false)
    alert('Unable to load action history')
    return
  }

  setObservationHistoryLogs(data || [])
  setObservationHistoryLoading(false)
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
    if (!currentStaff) {
      setSaveStatus((prev) => ({
        ...prev,
        [id]: 'error'
      }))

      alert('Staff login session not found')
      return
    }

    const currentCase = cases.find(
      (item) => String(item.id) === String(id)
    )

    const oldHandoverNote =
      currentCase?.handover_note || ''

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('observation_cases')
      .update({
        handover_note: value,

        handover_updated_by_staff_member_id:
          currentStaff.id,

        handover_updated_by_staff_id:
          currentStaff.staffId,

        handover_updated_by_staff_name:
          currentStaff.displayName,

        handover_updated_at: now,

        handover_last_action_type:
          'OBS_HANDOVER_FREE_TEXT_UPDATED'
      })
      .eq('id', id)

    if (error) {
      console.error(
        'Save observation handover note error:',
        error
      )

      setSaveStatus((prev) => ({
        ...prev,
        [id]: 'error'
      }))

      return
    }

    try {
      await writeAuditLog({
        staff: currentStaff,

        actionType:
          'OBS_HANDOVER_FREE_TEXT_UPDATED',

        entityType:
          'observation_case',

        entityId:
          id,

        bedNo:
          currentCase?.bed_no || null,

        oldData: {
          handover_note:
            oldHandoverNote
        },

        newData: {
          handover_note:
            value
        },

        metadata: {
          aeSuffix:
            currentCase?.ae_suffix || null,

          diagnosis:
            currentCase?.diagnosis || null
        }
      })
    } catch (auditError) {
      console.error(
        'Observation free text audit failed:',
        auditError
      )

      setSaveStatus((prev) => ({
        ...prev,
        [id]: 'error'
      }))

      alert(
        'Note saved, but audit log failed'
      )

      return
    }

    setCases((prev) =>
      prev.map((item) =>
        String(item.id) === String(id)
          ? {
              ...item,
              handover_note: value,

              handover_updated_by_staff_member_id:
                currentStaff.id,

              handover_updated_by_staff_id:
                currentStaff.staffId,

              handover_updated_by_staff_name:
                currentStaff.displayName,

              handover_updated_at:
                now,

              handover_last_action_type:
                'OBS_HANDOVER_FREE_TEXT_UPDATED'
            }
          : item
      )
    )

    setSaveStatus((prev) => ({
      ...prev,
      [id]: 'saved'
    }))

    setTimeout(() => {
      setSaveStatus((prev) => ({
        ...prev,
        [id]: ''
      }))
    }, 2000)
  }, 800)
}
async function addToHandover(id) {
  if (!currentStaff) {
    alert('Staff login session not found')
    return
  }

  const currentCase = cases.find(
    (item) =>
      String(item.id) === String(id)
  )

  if (!currentCase) {
    alert('Observation case not found')
    return
  }

  const now = new Date().toISOString()

  const oldData = {
    handover_manual:
      currentCase.handover_manual || false,

    handover_hidden:
      currentCase.handover_hidden || false
  }

  const newData = {
    handover_manual: true,
    handover_hidden: false
  }

  const { error } = await supabase
    .from('observation_cases')
    .update({
      ...newData,

      handover_updated_by_staff_member_id:
        currentStaff.id,

      handover_updated_by_staff_id:
        currentStaff.staffId,

      handover_updated_by_staff_name:
        currentStaff.displayName,

      handover_updated_at:
        now,

      handover_last_action_type:
        'OBS_HANDOVER_ADDED'
    })
    .eq('id', id)

  if (error) {
    console.error(
      'Add observation case to handover error:',
      error
    )

    alert('Unable to add case to handover')
    return
  }

  try {
    await writeAuditLog({
      staff: currentStaff,

      actionType:
        'OBS_HANDOVER_ADDED',

      entityType:
        'observation_case',

      entityId:
        currentCase.id,

      bedNo:
        currentCase.bed_no,

      oldData,
      newData,

      metadata: {
        aeSuffix:
          currentCase.ae_suffix || null,

        diagnosis:
          currentCase.diagnosis || null,

        source:
          'manual_add'
      }
    })
  } catch (auditError) {
    console.error(
      'Observation add to handover audit failed:',
      auditError
    )

    alert(
      'Case added, but audit log failed'
    )
  }

  setAddHandoverModal(false)

  await fetchCases()
}
async function hideFromHandover(id) {
  if (!currentStaff) {
    alert('Staff login session not found')
    return
  }

  const currentCase = cases.find(
    (item) =>
      String(item.id) === String(id)
  )

  if (!currentCase) {
    alert('Observation case not found')
    return
  }

  const now = new Date().toISOString()

  const oldData = {
    handover_hidden:
      currentCase.handover_hidden || false,

    handover_manual:
      currentCase.handover_manual || false
  }

  const newData = {
    handover_hidden: true
  }

  const { error } = await supabase
    .from('observation_cases')
    .update({
      handover_hidden: true,

      handover_updated_by_staff_member_id:
        currentStaff.id,

      handover_updated_by_staff_id:
        currentStaff.staffId,

      handover_updated_by_staff_name:
        currentStaff.displayName,

      handover_updated_at:
        now,

      handover_last_action_type:
        'OBS_HANDOVER_HIDDEN'
    })
    .eq('id', id)

  if (error) {
    console.error(
      'Hide observation handover case error:',
      error
    )

    alert('Unable to hide case from handover')
    return
  }

  try {
    await writeAuditLog({
      staff: currentStaff,

      actionType:
        'OBS_HANDOVER_HIDDEN',

      entityType:
        'observation_case',

      entityId:
        currentCase.id,

      bedNo:
        currentCase.bed_no,

      oldData,

      newData: {
        handover_hidden: true,
        handover_manual:
          currentCase.handover_manual || false
      },

      metadata: {
        aeSuffix:
          currentCase.ae_suffix || null,

        diagnosis:
          currentCase.diagnosis || null,

        source:
          'handover_page'
      }
    })
  } catch (auditError) {
    console.error(
      'Observation hide audit failed:',
      auditError
    )

    alert(
      'Case hidden, but audit log failed'
    )
  }

  setHideConfirmModal(null)

  await fetchCases()
}

async function hidePsyFromHandover(id) {
  if (!currentStaff) {
    alert('Staff login session not found')
    return
  }

  const currentCase = psyCases.find(
    (item) => String(item.id) === String(id)
  )

  if (!currentCase) {
    alert('Psychiatric case not found')
    return
  }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('psy_handover_cases')
    .update({
      handover_hidden: true,

      updated_by_staff_member_id:
        currentStaff.id,

      updated_by_staff_id:
        currentStaff.staffId,

      updated_by_staff_name:
        currentStaff.displayName,

        last_action_type:
  'PSY_CASE_HIDDEN',

      updated_by_at: now,
      updated_at: now
    })
    .eq('id', id)

  if (error) {
    console.error(
      'Hide psychiatric case error:',
      error
    )

    alert('Failed to hide psychiatric case')
    return
  }

  try {
    await writeAuditLog({
      staff: currentStaff,
      actionType: 'PSY_CASE_HIDDEN',
      entityType: 'psy_handover_case',
      entityId: currentCase.id,
      bedNo: currentCase.bed_no,
      oldData: {
        handover_hidden:
          currentCase.handover_hidden || false
      },
      newData: {
        handover_hidden: true
      },
      metadata: {
        patientLabel:
          currentCase.patient_label || null,
        location:
          currentCase.location || null
      }
    })
  } catch (auditError) {
    console.error(
      'Psychiatric hide audit failed:',
      auditError
    )

    alert(
      'Case hidden, but audit log failed'
    )
  }

  setPsyHideConfirmModal(null)
  await fetchPsyCases()
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
    if (!currentStaff) {
      setPsyFreeTextSaveStatus((prev) => ({
        ...prev,
        [id]: 'error'
      }))

      alert('Staff login session not found')
      return
    }

    const currentCase = psyCases.find(
      (item) => String(item.id) === String(id)
    )

    const oldFreeText =
      currentCase?.free_text || ''

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('psy_handover_cases')
      .update({
        free_text: value,

        updated_by_staff_member_id:
          currentStaff.id,

        updated_by_staff_id:
          currentStaff.staffId,

        updated_by_staff_name:
          currentStaff.displayName,

          last_action_type:
  'PSY_FREE_TEXT_UPDATED',

        updated_by_at: now,
        updated_at: now
      })
      .eq('id', id)

    if (error) {
      console.error(
        'Save psychiatric free text error:',
        error
      )

      setPsyFreeTextSaveStatus((prev) => ({
        ...prev,
        [id]: 'error'
      }))

      return
    }

    try {
      await writeAuditLog({
        staff: currentStaff,
        actionType: 'PSY_FREE_TEXT_UPDATED',
        entityType: 'psy_handover_case',
        entityId: id,
        bedNo: currentCase?.bed_no || null,
        oldData: {
          free_text: oldFreeText
        },
        newData: {
          free_text: value
        },
        metadata: {
          patientLabel:
            currentCase?.patient_label || null,
          location:
            currentCase?.location || null
        }
      })
    } catch (auditError) {
      console.error(
        'Psychiatric free text audit failed:',
        auditError
      )

      setPsyFreeTextSaveStatus((prev) => ({
        ...prev,
        [id]: 'error'
      }))

      return
    }

    setPsyCases((prev) =>
      prev.map((item) =>
        String(item.id) === String(id)
          ? {
              ...item,
              free_text: value,
              updated_by_staff_member_id:
                currentStaff.id,
              updated_by_staff_id:
                currentStaff.staffId,
              updated_by_staff_name:
                currentStaff.displayName,
              updated_by_at: now,
              updated_at: now
            }
          : item
      )
    )

    setPsyFreeTextSaveStatus((prev) => ({
      ...prev,
      [id]: 'saved'
    }))

    setTimeout(() => {
      setPsyFreeTextSaveStatus((prev) => ({
        ...prev,
        [id]: ''
      }))
    }, 2000)
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
  if (!currentStaff) {
  alert('Staff login session not found')
  return
}
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

const now = new Date().toISOString()

const { data: insertedCases, error } = await supabase
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

      handover_hidden: false,

      updated_by_staff_member_id:
        currentStaff.id,

      updated_by_staff_id:
        currentStaff.staffId,

      updated_by_staff_name:
        currentStaff.displayName,

        last_action_type:
  'PSY_CASE_CREATED',

      updated_by_at: now,
      updated_at: now
    }
  ])
  .select()

  if (error) {
    console.log(error)
    alert('Error adding psychiatric case')
    return
  }
  const insertedCase = insertedCases?.[0]

if (insertedCase) {
  try {
    await writeAuditLog({
      staff: currentStaff,
      actionType: 'PSY_CASE_CREATED',
      entityType: 'psy_handover_case',
      entityId: insertedCase.id,
      bedNo: insertedCase.bed_no,
      oldData: null,
      newData: {
        observation_case_id:
          insertedCase.observation_case_id,
        bed_no:
          insertedCase.bed_no,
        ae_suffix:
          insertedCase.ae_suffix,
        patient_label:
          insertedCase.patient_label,
        gender:
          insertedCase.gender,
        age:
          insertedCase.age,
        location:
          insertedCase.location,
        chief_complaint:
          insertedCase.chief_complaint,
        status:
          insertedCase.status,
        source:
          insertedCase.source
      },
      metadata: {
        createdFrom:
          selectedObservationCase
            ? 'observation_room'
            : 'manual'
      }
    })
  } catch (auditError) {
    console.error(
      'Psychiatric case creation audit failed:',
      auditError
    )

    alert(
      'Case added, but audit log failed'
    )
  }
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

async function openPsyHistory(item) {
  setPsyHistoryModal(item)
  setPsyHistoryLogs([])
  setPsyHistoryLoading(true)

  const { data, error } = await supabase.rpc(
    'get_psy_case_audit_history',
    {
      p_case_id: String(item.id)
    }
  )

  if (error) {
    console.error(
      'Load psychiatric history error:',
      error
    )

    setPsyHistoryLoading(false)
    alert('Unable to load action history')
    return
  }

  setPsyHistoryLogs(data || [])
  setPsyHistoryLoading(false)
}

async function confirmDischargePsyCase() {
  if (
    !psyDischargeConfirmModal ||
    isPsyDischarging
  ) {
    return
  }

  if (!currentStaff) {
    alert('Staff login session not found')
    return
  }

  const psyCase = psyDischargeConfirmModal
  const dischargeTime = new Date().toISOString()

  setIsPsyDischarging(true)

  try {
    const linkedObservationCase =
      psyCase.observation_case_id
        ? cases.find(
            (item) =>
              String(item.id) ===
              String(psyCase.observation_case_id)
          )
        : cases.find(
            (item) =>
              psyCase.bed_no &&
              String(item.bed_no) ===
                String(psyCase.bed_no)
          )

    if (linkedObservationCase) {
      const { error: observationError } =
        await supabase
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

    const oldData = {
      status: psyCase.status || '',
      outcome: psyCase.outcome || '',
      outcome_details:
        psyCase.outcome_details || {},
      handover_hidden:
        psyCase.handover_hidden || false
    }

    const newData = {
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
      handover_hidden: true
    }

    const { error: psyError } = await supabase
      .from('psy_handover_cases')
      .update({
        ...newData,

        updated_by_staff_member_id:
          currentStaff.id,

        updated_by_staff_id:
          currentStaff.staffId,

        updated_by_staff_name:
          currentStaff.displayName,

        updated_by_at: dischargeTime,
        updated_at: dischargeTime
      })
      .eq('id', psyCase.id)

    if (psyError) {
      throw psyError
    }

    try {
      await writeAuditLog({
        staff: currentStaff,
        actionType: 'PSY_CASE_DISCHARGED',
        entityType: 'psy_handover_case',
        entityId: psyCase.id,
        bedNo: psyCase.bed_no,
        oldData,
        newData,
        metadata: {
          patientLabel:
            psyCase.patient_label || null,
          location:
            psyCase.location || null,
          linkedObservationCaseId:
            linkedObservationCase?.id || null
        }
      })
    } catch (auditError) {
      console.error(
        'Psychiatric discharge audit failed:',
        auditError
      )

      alert(
        'Patient discharged, but audit log failed'
      )
    }

    setPsyDischargeConfirmModal(null)
    setPsyEditModal(null)

    await Promise.all([
      fetchCases(),
      fetchPsyCases()
    ])
  } catch (error) {
    console.error(
      'Psychiatric discharge error:',
      error
    )

    alert(
      'Discharge failed. Please try again.'
    )
  } finally {
    setIsPsyDischarging(false)
  }
}

async function savePsyChecklist() {
  if (!psyEditModal) return

  if (!currentStaff) {
    alert('Staff login session not found')
    return
  }

  if (
    psyEditStatus === PSY_STATUS_COMPLETE &&
    psyOutcomeType === 'Discharge'
  ) {
    setPsyDischargeConfirmModal(psyEditModal)
    return
  }

  const now = new Date().toISOString()

  const outcomeDetails =
    psyEditStatus === PSY_STATUS_COMPLETE
      ? {
          type: psyOutcomeType,
          admission_form:
            psyOutcomeType === 'Admission'
              ? psyAdmissionForm
              : '',
          hospital:
            psyOutcomeType === 'Admission'
              ? psyHospital
              : '',
          ward:
            psyOutcomeType === 'Admission'
              ? psyWard
              : '',
          fax_time:
            psyOutcomeType === 'Admission' &&
            psyAdmissionForm
              ? psyFaxTime
              : '',
          reply_time:
            psyOutcomeType === 'Admission' &&
            psyAdmissionForm
              ? psyReplyTime
              : '',
          transport:
            psyOutcomeType === 'Admission'
              ? psyTransport
              : '',
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
        ? `Admission${
            psyHospital
              ? ` - ${psyHospital}`
              : ''
          }${
            psyWard
              ? ` ${psyWard}`
              : ''
          }`
        : psyOutcomeType === 'Discharge'
          ? 'Discharge'
          : ''
      : ''

  const oldData = {
    status: psyEditModal.status || '',
    outcome: psyEditModal.outcome || '',
    outcome_details:
      psyEditModal.outcome_details || {},
    monitoring_checks:
      psyEditModal.monitoring_checks || {},
    miscellaneous_checks:
      psyEditModal.miscellaneous_checks || {}
  }

  const newData = {
    status: psyEditStatus,
    outcome: outcomeSummary,
    outcome_details: outcomeDetails,
    monitoring_checks: psyMonitoringChecks,
    miscellaneous_checks: psyMiscChecks
  }

  const { error } = await supabase
    .from('psy_handover_cases')
    .update({
      ...newData,

      updated_by_staff_member_id:
        currentStaff.id,

      updated_by_staff_id:
        currentStaff.staffId,

      updated_by_staff_name:
        currentStaff.displayName,

        last_action_type:
    'PSY_HANDOVER_UPDATED',

      updated_by_at: now,
      updated_at: now
    })
    .eq('id', psyEditModal.id)

  if (error) {
    console.error(
      'Error saving psychiatric checklist:',
      error
    )

    alert('Error saving psychiatric checklist')
    return
  }

  try {
    await writeAuditLog({
      staff: currentStaff,
      actionType: 'PSY_HANDOVER_UPDATED',
      entityType: 'psy_handover_case',
      entityId: psyEditModal.id,
      bedNo: psyEditModal.bed_no,
      oldData,
      newData,
      metadata: {
        patientLabel:
          psyEditModal.patient_label || null,
        location:
          psyEditModal.location || null
      }
    })
  } catch (auditError) {
    console.error(
      'Psychiatric audit log failed:',
      auditError
    )

    alert(
      'Handover saved, but audit log failed'
    )
  }

  setPsyEditModal(null)
  await fetchPsyCases()
}

const handoverCases = cases.filter((item) => {
  const isCatOneOrTwo =
    Number(item.category) === 1 ||
    Number(item.category) === 2

  const handoverTags =
    getHandoverTags(item)

  const hasNonCTHandover =
    handoverTags.some(
      (tag) => !isCTTag(tag)
    )

  const isStayOvernight =
    isStayOvernightBed(item.bed_no)

  const isManualHandover =
    item.handover_manual === true

  return (
    (
      isCatOneOrTwo ||
      hasNonCTHandover ||
      isStayOvernight ||
      isManualHandover
    ) &&
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
  const handoverTags =
    getHandoverTags(item)

  const hasNonCTHandover =
    handoverTags.some(
      (tag) => !isCTTag(tag)
    )

  return (
    hasNonCTHandover &&
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
  if (!item?.id) return null

  return (
    psyCases.find(
      (psy) =>
        psy.observation_case_id &&
        String(psy.observation_case_id) ===
          String(item.id)
    ) || null
  )
}

function getLinkedObservationCase(psyItem) {
  if (!psyItem?.observation_case_id) {
    return null
  }

  return (
    cases.find(
      (item) =>
        String(item.id) ===
        String(psyItem.observation_case_id)
    ) || null
  )
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
    <div className="bg-[#0078AE] px-5 py-4 text-white shadow-sm md:px-8 md:py-5">
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="text-xl font-bold md:text-3xl">
        {handoverTab === 'psy'
          ? 'Psychiatric Handover'
          : 'Observation Handover'}
      </h1>

      <p className="mt-1 text-sm text-white/80 md:text-lg">
        {handoverTab === 'psy'
          ? 'Psychiatric patient handover board'
          : 'Observation Room handover board'}
      </p>
    </div>

    <StaffHeaderInfo />
  </div>
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

<button
  type="button"
  onClick={() =>
    setHandoverNotificationModal(true)
  }
  className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
  aria-label="Open handover notifications"
>
  <Bell
    size={22}
    className={
      unreadHandoverCount > 0
        ? 'text-red-500'
        : 'text-gray-400'
    }
  />

  {unreadHandoverCount > 0 && (
    <span className="absolute right-0 top-0 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {unreadHandoverCount > 9
        ? '9+'
        : unreadHandoverCount}
    </span>
  )}
</button>
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

const hasOutstandingHandover =
  handoverTags.some((tag) => {
    if (isCTTag(tag)) {
      return (
        normalizeCTStatus(item.ct_status) ===
        CT_STATUS.PENDING
      )
    }

    return item.handover_done?.[tag] !== true
  })

const linkedPsyCase = getLinkedPsyCase(item)
    

  return (
    
<div
  key={item.id}
  className="grid grid-cols-1 md:grid-cols-[260px_1fr] border-b-[16px] border-gray-200"
>
                  {/* Bed card */}
                  <div className="p-4 md:p-5 md:border-r border-gray-100">
                    <div className="mb-3">
  <div className="inline-flex px-3 py-2 rounded-2xl bg-blue-100 text-[#0078AE] font-bold">
    Bed {item.bed_no}
  </div>

  {item.ae_suffix && (
    <p className="mt-2 text-xs font-semibold tracking-wider text-gray-500">
      AE•••••{item.ae_suffix}
    </p>
  )}
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

{(
  item.handover_updated_by_staff_name ||
  item.created_by_staff_name
) && (
  <div className="mt-4 border-t border-gray-200 pt-3">
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
      Last update
    </p>

    <p className="mt-1 text-xs font-bold text-gray-800">
      {item.handover_updated_by_staff_name ||
        item.created_by_staff_name}
    </p>

    <p className="mt-1 text-[11px] leading-4 text-gray-500">
      {item.handover_last_action_type
        ? getObservationActionLabel(
            item.handover_last_action_type
          )
        : 'Case created'}

      {(item.handover_updated_at ||
        item.created_at) && (
        <>
          {' · '}
          {formatLastUpdatedTime(
            item.handover_updated_at ||
              item.created_at
          )}
        </>
      )}
    </p>

    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        openObservationHistory(item)
      }}
      className="mt-2 text-[11px] font-bold text-[#0078AE] hover:underline"
    >
      View History
    </button>
  </div>
)}

</div>
</div>

{/* Handover Notes */}
<div
  onClick={() =>
    openObservationDetail(item)
  }
  className="p-4 md:p-5 flex flex-col gap-3 relative cursor-pointer hover:bg-gray-50 transition"
>
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
    !hasHandover || !hasOutstandingHandover
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
          const isCT = isCTTag(text)
          const done = !isCT && item.handover_done?.[text]
          const ctMeta = getCTStatusMeta(item.ct_status)

          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                openObservationDetail(item)
              }}
              className={`px-4 md:px-5 py-2 rounded-2xl text-sm md:text-lg font-bold flex items-center gap-2 ${
                isCT
                  ? ctMeta.tagClass
                  : done
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

              {isCT && (
                <CTStatusBadge status={item.ct_status} />
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
  <div
  className={`grid grid-cols-1 gap-3 ${
    linkedPsyCase
      ? 'md:grid-cols-2'
      : ''
  }`}
>
  {/* Observation Free Text */}
  <div className="bg-white border border-gray-200 rounded-2xl p-3">
    <p className="text-xs font-bold text-gray-500 mb-2">
      Observation Free Text
    </p>

    <textarea
      value={handoverNotes[item.id] || ''}
      onClick={(e) => e.stopPropagation()}
      onFocus={() => setIsEditingNote(true)}
      onBlur={() => setIsEditingNote(false)}
      onChange={(e) => {
        handleHandoverNoteChange(
          item.id,
          e.target.value
        )
      }}
      placeholder="Enter observation handover notes..."
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

  {linkedPsyCase && (
  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3">
    <p className="text-xs font-bold text-purple-700 mb-2">
      Psychiatric Free Text
    </p>

    <div className="min-h-[90px] whitespace-pre-wrap text-sm md:text-base text-gray-700">
      {linkedPsyCase.free_text || '-'}
    </div>

    {linkedPsyCase.updated_by_staff_name && (
      <p className="mt-2 text-[11px] text-gray-500">
        Last updated by{' '}
        <span className="font-bold">
          {linkedPsyCase.updated_by_staff_name}
        </span>

        {linkedPsyCase.updated_by_at && (
          <>
            {' · '}
            {formatLastUpdatedTime(
              linkedPsyCase.updated_by_at
            )}
          </>
        )}
      </p>
    )}
  </div>
)}
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
    psychiatricCases.map((item) => {
  const linkedObservationCase =
    getLinkedObservationCase(item)

  return (
      <div
  key={item.id}
  onClick={() => openPsyEditModal(item)}
  className="grid grid-cols-1 md:grid-cols-[260px_1fr] border-b-[16px] border-gray-200 hover:bg-gray-50 transition cursor-pointer bg-white"
>
        {/* Case Card */}
        <div className="p-4 md:p-5 md:border-r border-gray-100 bg-gray-50 md:bg-white">
          <div className="mb-3">
  <div className="inline-flex px-3 py-2 rounded-2xl bg-blue-100 text-[#0078AE] font-bold">
    {item.bed_no
      ? `Bed ${item.bed_no}`
      : 'Ambulatory Case'}
  </div>

  {item.ae_suffix && (
    <p className="mt-2 text-xs font-semibold tracking-wider text-gray-500">
      AE•••••{item.ae_suffix}
    </p>
  )}
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

{item.updated_by_staff_name && (
  <div className="mt-3 border-t border-gray-200 pt-3">
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
      Last update
    </p>

    <p className="mt-1 text-xs font-bold text-gray-800">
      {item.updated_by_staff_name}
    </p>

    <p className="mt-1 text-[11px] leading-4 text-gray-500">
      {getPsyActionLabel(
        item.last_action_type
      )}

      {item.updated_by_at && (
        <>
          {' · '}
          {formatLastUpdatedTime(
            item.updated_by_at
          )}
        </>
      )}
    </p>
     <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        openPsyHistory(item)
      }}
      className="mt-2 text-[11px] font-bold text-[#0078AE] hover:underline"
    >
      View History
    </button>
  </div>
)}
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

          <div
  className={`grid grid-cols-1 gap-3 ${
    linkedObservationCase
      ? 'md:grid-cols-2'
      : ''
  }`}
>
  {/* Psychiatric Free Text */}
  <div className="bg-white border border-gray-200 rounded-2xl p-3">
    <p className="text-xs font-bold text-gray-500 mb-2">
      Psychiatric Free Text
    </p>

    <textarea
      value={psyFreeTextNotes[item.id] || ''}
      onClick={(e) => e.stopPropagation()}
      onFocus={() => setIsEditingNote(true)}
      onBlur={() => setIsEditingNote(false)}
      onChange={(e) => {
        handlePsyFreeTextChange(
          item.id,
          e.target.value
        )
      }}
      placeholder="Enter psychiatric handover notes..."
      className="w-full min-h-[70px] resize-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 md:min-h-[90px] md:text-base"
    />

    <div className="mt-2 h-5 text-xs font-semibold">
      {psyFreeTextSaveStatus[item.id] ===
        'saving' && (
        <span className="text-gray-400">
          Saving...
        </span>
      )}

      {psyFreeTextSaveStatus[item.id] ===
        'saved' && (
        <span className="text-green-600">
          Saved ✓
        </span>
      )}

      {psyFreeTextSaveStatus[item.id] ===
        'error' && (
        <span className="text-red-600">
          Save failed
        </span>
      )}
    </div>
  </div>

  {/* Only show when linked from Observation Room */}
  {linkedObservationCase && (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
      <p className="mb-2 text-xs font-bold text-[#0078AE]">
        Observation Free Text
      </p>

      <div className="min-h-[70px] whitespace-pre-wrap text-sm text-gray-700 md:min-h-[90px] md:text-base">
        {linkedObservationCase.handover_note || '-'}
      </div>

      {linkedObservationCase
        .handover_updated_by_staff_name && (
        <p className="mt-2 text-[11px] text-gray-500">
          Last updated by{' '}
          <span className="font-bold">
            {
              linkedObservationCase
                .handover_updated_by_staff_name
            }
          </span>

          {linkedObservationCase
            .handover_updated_at && (
            <>
              {' · '}
              {formatLastUpdatedTime(
                linkedObservationCase
                  .handover_updated_at
              )}
            </>
          )}
        </p>
      )}
    </div>
  )}
</div>
        </div>
      </div>
      )
})
  )}
</div>
)}

{handoverNotificationModal && (
  <div
    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4"
    onClick={() =>
      setHandoverNotificationModal(false)
    }
  >
    <div
      className="max-h-[88vh] w-full max-w-[620px] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Nursing Handover Notifications
          </p>

          <h2 className="mt-1 text-2xl font-bold text-[#0078AE]">
            New Handover
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {unreadHandoverCount}{' '}
            unread notification
            {unreadHandoverCount === 1
              ? ''
              : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setHandoverNotificationModal(false)
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-2xl font-bold text-gray-500"
        >
          ×
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {unreadHandoverCases.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-8 text-center">
            <Bell
              size={34}
              className="mx-auto text-gray-300"
            />

            <p className="mt-3 font-bold text-gray-500">
              No unread handover
            </p>
          </div>
        ) : (
          unreadHandoverCases.map((item) => {
            const tags =
              getHandoverTags(item).filter(
                (tag) => !isCTTag(tag)
              )

            return (
              <button
                key={item.id}
                type="button"
                onClick={async () => {
                  setHandoverNotificationModal(
                    false
                  )

                  await openObservationDetail(
                    item
                  )
                }}
                className="w-full rounded-2xl border border-red-100 bg-red-50 p-4 text-left transition hover:bg-red-100"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex rounded-xl bg-blue-100 px-3 py-1.5 font-bold text-[#0078AE]">
                      Bed {item.bed_no}
                    </div>

                    {item.ae_suffix && (
                      <p className="mt-2 text-xs font-semibold tracking-wider text-gray-500">
                        AE•••••
                        {item.ae_suffix}
                      </p>
                    )}
                  </div>

                  <span className="rounded-lg bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-600">
                    New
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Nursing handover
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.length > 0 ? (
                      tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-xl bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-700"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">
                        -
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-red-100 pt-3">
                  <p className="text-xs text-gray-500">
                    Created by
                  </p>

                  <p className="mt-1 font-bold text-gray-900">
                    {item.initial_handover_by_staff_name ||
                      item.created_by_staff_name ||
                      'Unknown staff'}
                  </p>

                  {(item.initial_handover_by_staff_id ||
                    item.created_by_staff_id) && (
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      Staff ID:{' '}
                      {item.initial_handover_by_staff_id ||
                        item.created_by_staff_id}
                    </p>
                  )}

                  {item.created_at && (
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(
                        item.created_at
                      ).toLocaleString(
                        'en-GB',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }
                      )}
                    </p>
                  )}
                </div>

                <p className="mt-3 text-xs font-bold text-[#0078AE]">
                  Open case →
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  </div>
)}

{observationHistoryModal && (
  <div
    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4"
    onClick={() =>
      setObservationHistoryModal(null)
    }
  >
    <div
      className="max-h-[88vh] w-full max-w-[620px] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Observation Handover History
          </p>

          <h2 className="mt-1 text-2xl font-bold text-[#0078AE]">
            Bed {observationHistoryModal.bed_no}
          </h2>

          {observationHistoryModal.ae_suffix && (
            <p className="mt-1 text-sm font-semibold tracking-wider text-gray-500">
              AE•••••
              {observationHistoryModal.ae_suffix}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setObservationHistoryModal(null)
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-2xl font-bold text-gray-500"
        >
          ×
        </button>
      </div>

      <div className="mt-6">
        {observationHistoryLoading ? (
          <div className="rounded-2xl bg-gray-50 p-6 text-center font-bold text-gray-500">
            Loading history...
          </div>
        ) : observationHistoryLogs.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-6 text-center font-bold text-gray-400">
            No action history yet
          </div>
        ) : (
          <div className="space-y-4">
            {observationHistoryLogs.map(
              (log) => {
               const details =
  getUnifiedActionDetails(log)

                return (
                  <div
                    key={log.log_id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
  <span
    className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
      log.source_type === 'Psychiatric'
        ? 'bg-purple-100 text-purple-700'
        : 'bg-blue-100 text-[#0078AE]'
    }`}
  >
    {log.source_type || 'Observation'}
  </span>

  <p className="mt-2 font-bold text-gray-900">
    {getUnifiedActionLabel(
      log.action_type
    )}
  </p>
                        <p className="mt-1 text-sm text-gray-600">
                          By{' '}
                          <span className="font-bold">
                            {log.staff_name}
                          </span>
                        </p>
                      </div>

                      <p className="text-xs font-semibold text-gray-400">
                        {new Date(
                          log.created_at
                        ).toLocaleString(
                          'en-GB',
                          {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )}
                      </p>
                    </div>

                    {details.before !== null &&
                      details.after !== null && (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                              Before
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-gray-700">
                              {details.before}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                              After
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-gray-700">
                              {details.after}
                            </p>
                          </div>
                        </div>
                      )}

                    {details.before === null &&
                      details.after && (
                        <div className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-gray-700">
                          {details.after}
                        </div>
                      )}
                  </div>
                )
              }
            )}
          </div>
        )}
      </div>
    </div>
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
       <div>
  <h2 className="text-3xl font-bold text-[#0078AE]">
    Bed {detailModal.bed_no}
  </h2>

  {detailModal.ae_suffix && (
    <p className="mt-1 text-sm font-semibold tracking-wider text-gray-500">
      AE•••••{detailModal.ae_suffix}
    </p>
  )}
</div>

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
            const isCT = isCTTag(text)

            if (!text) return null

            if (isCT) {
              const ctMeta = getCTStatusMeta(detailModal.ct_status)

              return (
                <div
                  key={index}
                  className={`rounded-2xl border bg-gray-50 p-4 ${ctMeta.borderClass}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-900">
                        CT Status
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Select current CT status
                      </p>
                    </div>

                    <CTStatusBadge status={detailModal.ct_status} />
                  </div>

                  <div className="mt-4 space-y-3">
                    {[
                      {
                        value: CT_STATUS.PENDING,
                        label: 'Pending CT'
                      },
                      {
                        value: CT_STATUS.AWAIT_REPORT,
                        label: 'Await Report'
                      },
                      {
                        value: CT_STATUS.COMPLETED,
                        label: 'Report Reviewed'
                      }
                    ].map((option) => {
                      const selected =
                        normalizeCTStatus(detailModal.ct_status) ===
                        option.value

                      const optionMeta =
                        getCTStatusMeta(option.value)

                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            selected
                              ? `${optionMeta.tagClass} ${optionMeta.borderClass}`
                              : 'border-gray-200 bg-white text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`ct-status-${detailModal.id}`}
                            value={option.value}
                            checked={selected}
                            onChange={() => {
                              setDetailModal((prev) => ({
                                ...prev,
                                ct_status: option.value
                              }))
                            }}
                            className="h-5 w-5"
                          />

                          <span className="font-semibold">
                            {option.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            }

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
                        [text]: checked
                      }))
                    }}
                    className="w-5 h-5"
                  />

                  <span>{text}</span>
                </label>
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
    if (!currentStaff) {
      alert('Staff login session not found')
      return
    }

    const now = new Date().toISOString()

    const handoverTags =
      getHandoverTags(detailModal)

    const hasCT =
      handoverTags.some(isCTTag)

    const oldChecklist =
      detailModal.handover_done || {}

    const newChecklist =
      handoverChecks || {}

    const oldCTStatus =
      hasCT
        ? normalizeCTStatus(
            detailModal.original_ct_status
          )
        : null

    const newCTStatus =
      hasCT
        ? normalizeCTStatus(
            detailModal.ct_status
          )
        : null

    const checklistChanged =
      JSON.stringify(oldChecklist) !==
      JSON.stringify(newChecklist)

    const ctStatusChanged =
      hasCT &&
      oldCTStatus !== newCTStatus

    let actionType =
      'OBS_HANDOVER_CHECKLIST_UPDATED'

    if (checklistChanged && ctStatusChanged) {
      actionType =
        'OBS_HANDOVER_AND_CT_UPDATED'
    } else if (ctStatusChanged) {
      actionType =
        'OBS_CT_STATUS_UPDATED'
    }

    const oldData = {
      handover_done:
        oldChecklist,

      ct_status:
        oldCTStatus
    }

    const newData = {
      handover_done:
        newChecklist,

      ct_status:
        newCTStatus
    }

    const updatePayload = {
      handover_done:
        newChecklist,

      handover_updated_by_staff_member_id:
        currentStaff.id,

      handover_updated_by_staff_id:
        currentStaff.staffId,

      handover_updated_by_staff_name:
        currentStaff.displayName,

      handover_updated_at:
        now,

      handover_last_action_type:
        actionType
    }

    if (hasCT) {
      updatePayload.ct_status =
        newCTStatus

      updatePayload.ct_updated_at =
        now
    }

    const { error } = await supabase
      .from('observation_cases')
      .update(updatePayload)
      .eq('id', detailModal.id)

    if (error) {
      console.error(
        'Save checklist and CT status error:',
        error
      )

      alert('Unable to save changes')
      return
    }

    try {
      await writeAuditLog({
        staff: currentStaff,

        actionType,

        entityType:
          'observation_case',

        entityId:
          detailModal.id,

        bedNo:
          detailModal.bed_no,

        oldData,
        newData,

        metadata: {
          aeSuffix:
            detailModal.ae_suffix || null,

          diagnosis:
            detailModal.diagnosis || null,

          checklistChanged,
          ctStatusChanged
        }
      })
    } catch (auditError) {
      console.error(
        'Observation handover audit failed:',
        auditError
      )

      alert(
        'Changes saved, but audit log failed'
      )
    }

    setDetailModal(null)
    await fetchCases()
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

{psyHistoryModal && (
  <div
    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4"
    onClick={() => setPsyHistoryModal(null)}
  >
    <div
      className="w-full max-w-[620px] max-h-[88vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Psychiatric Case History
          </p>

          <h2 className="mt-1 text-2xl font-bold text-[#0078AE]">
            {psyHistoryModal.bed_no
              ? `Bed ${psyHistoryModal.bed_no}`
              : psyHistoryModal.patient_label ||
                'Ambulatory Case'}
          </h2>

          {psyHistoryModal.ae_suffix && (
            <p className="mt-1 text-sm font-semibold tracking-wider text-gray-500">
              AE•••••{psyHistoryModal.ae_suffix}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setPsyHistoryModal(null)
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-2xl font-bold text-gray-500"
        >
          ×
        </button>
      </div>

      <div className="mt-6">
        {psyHistoryLoading ? (
          <div className="rounded-2xl bg-gray-50 p-6 text-center font-bold text-gray-500">
            Loading history...
          </div>
        ) : psyHistoryLogs.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-6 text-center font-bold text-gray-400">
            No action history yet
          </div>
        ) : (
          <div className="space-y-4">
            {psyHistoryLogs.map((log) => {
             const details =
  getUnifiedActionDetails(log)

              return (
                <div
                  key={log.log_id}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
  <span
    className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
      log.source_type === 'Psychiatric'
        ? 'bg-purple-100 text-purple-700'
        : 'bg-blue-100 text-[#0078AE]'
    }`}
  >
    {log.source_type || 'Psychiatric'}
  </span>

  <p className="mt-2 font-bold text-gray-900">
                        {getUnifiedActionLabel(
  log.action_type
)}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        By{' '}
                        <span className="font-bold">
                          {log.staff_name}
                        </span>
                      </p>
                    </div>

                    <p className="text-xs font-semibold text-gray-400">
                      {new Date(
                        log.created_at
                      ).toLocaleString(
                        'en-GB',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }
                      )}
                    </p>
                  </div>

{details.before !== null &&
  details.after !== null && (
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            Before
                          </p>

                          <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-gray-700">
                            {details.before}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            After
                          </p>

                          <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-gray-700">
                            {details.after}
                          </p>
                        </div>
                      </div>
                    )}

                  {details.before === null &&
  details.after && (
                      <div className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-gray-700">
                        {details.after}
                      </div>
                    )}
                </div>
              )
            })}
          </div>
        )}
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