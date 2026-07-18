'use client'

import {
  UsersRound,
  ShieldAlert,
  ClipboardList,
  Brain,
  ScanLine,
  Clock3,
  CircleHelp,
  Mars,
  Venus
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import BottomNav from '../components/BottomNav'
import StaffHeaderInfo from '../components/StaffHeaderInfo'
import { useStaff } from '../components/StaffProvider'
import { writeAuditLog } from '../../lib/auditLog'


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

export default function DashboardPage() {
  const {
    currentStaff,
    staffLoading
  } = useStaff()

  const [cases, setCases] = useState([])
  const [modalTitle, setModalTitle] = useState('')
const [modalCases, setModalCases] = useState([])
const [currentTime, setCurrentTime] = useState('')
const [actionModal, setActionModal] = useState(null)
const [sortBy, setSortBy] = useState('time_desc')
const [searchTerm, setSearchTerm] = useState('')
const [viewMode, setViewMode] = useState('table')
const [detailModal, setDetailModal] = useState(null)
const [handoverChecks, setHandoverChecks] = useState({})
const [q1hModal, setQ1hModal] = useState(false)
const [dropQ1hModal, setDropQ1hModal] = useState(false)
const [changeBedModal, setChangeBedModal] = useState(null)
const [newBedNo, setNewBedNo] = useState('')
const [changeBedError, setChangeBedError] = useState('')

const [ctModal, setCtModal] = useState(null)
const [ctUpdating, setCtUpdating] = useState(false)



 useEffect(() => {
  fetchCases()

  const channel = supabase
    .channel('observation_cases_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'observation_cases',
      },
      () => {
        fetchCases()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])

  useEffect(() => {
  const timer = setInterval(() => {
    const now = new Date()

    setCurrentTime(
      now.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    )
  }, 1000)

  return () => clearInterval(timer)
}, [])

function getElapsedMinutes(timestamp) {
  if (!timestamp) return 0

  const created = new Date(timestamp)
  const now = new Date()

  return Math.floor((now - created) / 1000 / 60)
}
function getAlertColor(minutes) {
  if (minutes >= 60) {
    return {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300',
    }
  }

  if (minutes >= 30) {
    return {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-300',
    }
  }

  return {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
  }
}
  async function fetchCases() {
    const { data, error } = await supabase
      .from('observation_cases')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log(error)
    } else {
      setCases(data)
    }
  }
  function openCaseModal(title, list) {
  setModalTitle(title)
  setModalCases(list)
}

async function updateDashboardCTStatus(
  newStatus
) {
  if (!ctModal || ctUpdating) return

  if (!currentStaff) {
    alert('Staff login session not found')
    return
  }

  const oldStatus =
    normalizeCTStatus(ctModal.ct_status)

  const normalizedNewStatus =
    normalizeCTStatus(newStatus)

  if (oldStatus === normalizedNewStatus) {
    alert('CT status has not changed')
    return
  }

  setCtUpdating(true)

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('observation_cases')
    .update({
      ct_status:
        normalizedNewStatus,

      ct_updated_at:
        now,

      handover_updated_by_staff_member_id:
        currentStaff.id,

      handover_updated_by_staff_id:
        currentStaff.staffId,

      handover_updated_by_staff_name:
        currentStaff.displayName,

      handover_updated_at:
        now,

      handover_last_action_type:
        'OBS_CT_STATUS_UPDATED'
    })
    .eq('id', ctModal.id)

  if (error) {
    console.error(
      'Dashboard CT status update error:',
      error
    )

    alert('Unable to update CT status')
    setCtUpdating(false)
    return
  }

  try {
    await writeAuditLog({
      staff: currentStaff,

      actionType:
        'OBS_CT_STATUS_UPDATED',

      entityType:
        'observation_case',

      entityId:
        ctModal.id,

      bedNo:
        ctModal.bed_no,

      oldData: {
        ct_status:
          oldStatus
      },

      newData: {
        ct_status:
          normalizedNewStatus
      },

      metadata: {
        source:
          'dashboard_ct_card',

        aeSuffix:
          ctModal.ae_suffix || null,

        diagnosis:
          ctModal.diagnosis || null
      }
    })
  } catch (auditError) {
    console.error(
      'Dashboard CT audit failed:',
      auditError
    )

    alert(
      'CT status updated, but audit log failed'
    )
  }

  setCases((prev) =>
    prev.map((item) =>
      String(item.id) ===
      String(ctModal.id)
        ? {
            ...item,

            ct_status:
              normalizedNewStatus,

            ct_updated_at:
              now,

            handover_updated_by_staff_member_id:
              currentStaff.id,

            handover_updated_by_staff_id:
              currentStaff.staffId,

            handover_updated_by_staff_name:
              currentStaff.displayName,

            handover_updated_at:
              now,

            handover_last_action_type:
              'OBS_CT_STATUS_UPDATED'
          }
        : item
    )
  )

  setCtModal(null)
  setCtUpdating(false)

  await fetchCases()
}

async function handleAcknowledge(id) {
  const acknowledgedAt = new Date().toISOString()

  const { error: observationError } = await supabase
    .from('observation_cases')
    .update({
      acknowledged_at: acknowledgedAt,
      status: 'in_observation'
    })
    .eq('id', id)

  if (observationError) {
    console.error(
      'Acknowledge observation case error:',
      observationError
    )
    return
  }

  const { error: psyError } = await supabase
    .from('psy_handover_cases')
    .update({
      location: 'Observation Room',
      updated_at: acknowledgedAt
    })
    .eq('observation_case_id', id)
    .eq('handover_hidden', false)

  if (psyError) {
    console.error(
      'Update psychiatric location error:',
      psyError
    )
  }

  fetchCases()
}

async function handleVS(id) {
  const { error } = await supabase
    .from('observation_cases')
    .update({
      vs_taken_at: new Date().toISOString(),
      status: 'in_observation'
    })
    .eq('id', id)

  if (!error) fetchCases()
}

function getDischargeWarnings(item) {
  const warnings = []

  if (!item.acknowledged_at) {
    warnings.push('Patient has not been acknowledged')
  }

  if (!item.vs_taken_at) {
    warnings.push('Vital signs have not been taken')
  }

  return warnings
}

async function handleDischarge(item) {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('observation_cases')
    .update({
      discharged_at: now,
      confirmed_dc_at: now,
      status: 'discharged'
    })
    .eq('id', item.id)

  if (error) {
    console.log(error)
    alert('Error discharging case')
    return
  }

  // Hide psychiatric handover case linked by observation_case_id
  await supabase
    .from('psy_handover_cases')
    .update({
      handover_hidden: true,
      updated_at: now
    })
    .eq('observation_case_id', item.id)

  // Backup: hide old/backfilled psychiatric case linked by bed_no
  await supabase
    .from('psy_handover_cases')
    .update({
      handover_hidden: true,
      updated_at: now
    })
    .eq('bed_no', item.bed_no)
    .not('bed_no', 'is', null)

  fetchCases()
}

async function handleChangeBed() {
  if (!changeBedModal || !newBedNo.trim()) return

  const oldBedNo = String(changeBedModal.bed_no)
  const newBed = newBedNo.trim()
  const changedAt = new Date().toISOString()

  // Check duplicated bed
  const { data: existingBed, error: checkError } = await supabase
    .from('observation_cases')
    .select('id')
    .eq('bed_no', newBed)
    .neq('id', changeBedModal.id)
    .is('confirmed_dc_at', null)
    .maybeSingle()

  if (checkError) {
    console.error('Check bed error:', checkError)
    setChangeBedError('Unable to check bed availability')
    return
  }

  if (existingBed) {
    setChangeBedError(`Bed ${newBed} already occupied`)
    return
  }

  // 1. Update Observation Room case
  const { error: observationError } = await supabase
    .from('observation_cases')
    .update({
      bed_no: newBed,
      changed_bed_at: changedAt
    })
    .eq('id', changeBedModal.id)

  if (observationError) {
    console.error('Change bed error:', observationError)
    setChangeBedError('Failed to change bed')
    return
  }

  // 2. Update linked psychiatric case by observation_case_id
  const { error: linkedPsyError } = await supabase
    .from('psy_handover_cases')
    .update({
      bed_no: newBed,
      updated_at: changedAt
    })
    .eq('observation_case_id', changeBedModal.id)

  if (linkedPsyError) {
    console.error(
      'Update linked psychiatric bed error:',
      linkedPsyError
    )
    setChangeBedError(
      'Bed changed, but psychiatric handover update failed'
    )
    return
  }

  // 3. Backup for old psychiatric records
  // that do not have observation_case_id
  const { error: backupPsyError } = await supabase
    .from('psy_handover_cases')
    .update({
      bed_no: newBed,
      observation_case_id: changeBedModal.id,
      updated_at: changedAt
    })
    .eq('bed_no', oldBedNo)
    .is('observation_case_id', null)
    .eq('handover_hidden', false)

  if (backupPsyError) {
    console.error(
      'Backup psychiatric bed update error:',
      backupPsyError
    )
  }

  setChangeBedError('')
  setChangeBedModal(null)
  setNewBedNo('')
  setDetailModal(null)

  await fetchCases()
}

async function addQ1H(id) {
  const { error } = await supabase
    .from('observation_cases')
    .update({
      q1h_monitoring: true
    })
    .eq('id', id)

  if (!error) {
    setQ1hModal(false)
    fetchCases()
  }
}
async function dropQ1H(id) {
  const { error } = await supabase
    .from('observation_cases')
    .update({
      q1h_monitoring: false
    })
    .eq('id', id)

  if (!error) {
    setDropQ1hModal(false)
    fetchCases()
  }
}
async function confirmAction() {
  if (!actionModal) return

  if (actionModal.type === 'ack') {
    await handleAcknowledge(actionModal.item.id)
  }

  if (actionModal.type === 'vs') {
    await handleVS(actionModal.item.id)
  }

  if (actionModal.type === 'dc') {
    await handleDischarge(actionModal.item)
  }

  setActionModal(null)
}
  const activeCases = cases.filter((item) => !item.confirmed_dc_at)

const pendingAck = activeCases.filter(
  (item) => !item.acknowledged_at
)

const pendingVS = activeCases.filter(
  (item) => item.acknowledged_at && !item.vs_taken_at
)

function hasCTHandover(item) {
  const handoverTasks = String(
    item.nursing_handover || ''
  )
    .split(',')
    .map((task) => task.trim().toUpperCase())

  return (
    handoverTasks.includes('CT') ||
    handoverTasks.includes('CTB')
  )
}

const ctCases = activeCases.filter(
  (item) =>
    hasCTHandover(item) &&
    item.ct_status !== 'completed'
)

const pendingCTCases = ctCases.filter(
  (item) =>
    !item.ct_status ||
    item.ct_status === 'pending_ct'
)

const awaitReportCases = ctCases.filter(
  (item) =>
    item.ct_status === 'await_report'
)

const q1hCases = activeCases.filter(
  (item) => item.q1h_monitoring === true
)

  const fallRisk = activeCases.filter(
    (item) => item.fall_risk === 'Yes'
  )
const headInjuryCases = activeCases.filter(
  (item) =>
    item.head_injury === true ||
    item.head_injury === 'Yes'
)

const psyMissingCases = activeCases.filter(
  (item) => item.missing_risk
)

const handoverCases = activeCases.filter(
  (item) => item.nursing_handover
)
const sortedCases = [...activeCases].sort((a, b) => {
  if (sortBy === 'time_desc') {
    return new Date(b.created_at) - new Date(a.created_at)
  }

  if (sortBy === 'time_asc') {
    return new Date(a.created_at) - new Date(b.created_at)
  }

  if (sortBy === 'cat_asc') {
    return Number(a.category) - Number(b.category)
  }

  if (sortBy === 'cat_desc') {
    return Number(b.category) - Number(a.category)
  }

if (sortBy === 'status') {

  const statusOrder = {
    pending_ack: 1,
    pending_vs: 2,
    in_observation: 3
  }

  const getStatus = (item) => {
    if (!item.acknowledged_at) {
      return 'pending_ack'
    }

    if (item.acknowledged_at && !item.vs_taken_at) {
      return 'pending_vs'
    }

    return 'in_observation'
  }

  return (
    statusOrder[getStatus(a)] -
    statusOrder[getStatus(b)]
  )
}

  return 0
})

const filteredCases = sortedCases.filter((item) => {

  const search = searchTerm.toLowerCase()

  return (
    item.bed_no?.toString().includes(search) ||
    item.gender?.toLowerCase().includes(search) ||
    item.nursing_handover?.toLowerCase().includes(search) ||
    item.remarks?.toLowerCase().includes(search)
  )
})


  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-32 md:pb-40">

<div className="bg-[#0078AE] px-5 py-4 text-white shadow-lg md:px-8 md:py-5">
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="text-xl font-bold md:text-3xl">
        Observation Room Tracking Dashboard
      </h1>

      <p className="mt-1 text-sm text-white/80 md:text-base">
        NDH AED
      </p>
    </div>

    <div className="flex flex-col gap-3 md:items-end">
      <div className="text-left md:text-right">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
          Current Time
        </p>

        <p className="mt-1 text-base font-bold text-white md:text-xl">
          {currentTime || '--'}
        </p>
      </div>

      <StaffHeaderInfo />
    </div>
  </div>
</div>

      <div className="p-8 space-y-6">

     {/* Top row */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">

 <div className="col-span-1 md:col-span-3 bg-gradient-to-br from-[#245C8F] to-[#3D8CA8] rounded-3xl p-8 shadow text-white">
  <p className="text-xl font-bold">
    Total patients in<br />Observation Room
  </p>

  <div className="mt-10 flex items-center justify-between">
    <p className="text-8xl font-bold">
      {activeCases.length}
    </p>

    <UsersRound size={90} strokeWidth={1.5} className="opacity-80" />
  </div>
</div>

  <div className="col-span-1 md:col-span-4 bg-white rounded-3xl p-8 shadow">
    <h2 className="text-xl font-bold mb-8">
      Pending Acknowledgement ({pendingAck.length})
    </h2>

    <div className="flex flex-wrap gap-4">
      {pendingAck.map((item) => {
  const minutes = getElapsedMinutes(item.created_at)
  const colors = getAlertColor(minutes)

  return (
    <BedBlock
    blink={minutes >= 30}
      key={item.id}
      bed={item.bed_no}
      color={
        minutes >= 60
          ? "#FEE4E2"
          : minutes >= 30
          ? "#FFF3E0"
          : "#F3F4F6"
      }
      textColor={
        minutes >= 60
          ? "#B42318"
          : minutes >= 30
          ? "#F97316"
          : "#6B7280"
      }
    />
  )
})}
    </div>
  </div>

  <div className="col-span-1 md:col-span-5 bg-white rounded-3xl p-8 shadow">
    <h2 className="text-xl font-bold mb-8">
      Pending VS ({pendingVS.length})
    </h2>

    <div className="flex flex-wrap gap-4">
      {pendingVS.map((item) => {
  const minutes = getElapsedMinutes(item.acknowledged_at)

  return (
    <BedBlock
    blink={minutes >= 30}
      key={item.id}
      bed={item.bed_no}
      color={
        minutes >= 60
          ? "#FEE4E2"
          : minutes >= 30
          ? "#FFF3E0"
          : "#F3F4F6"
      }
      textColor={
        minutes >= 60
          ? "#B42318"
          : minutes >= 30
          ? "#F97316"
          : "#6B7280"
      }
    />
  )
})}
    </div>
    
  </div>

</div>


{/* Second row */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">

<RiskWorkflowCard
  fallRiskCases={fallRisk}
  headInjuryCases={headInjuryCases}
  onViewAll={openCaseModal}
/>

<SmallCard
  title="PSY / SP / Missing"
  list={psyMissingCases}
  icon={<CircleHelp size={34} />}
  color="#4F8A5B"
  onViewAll={openCaseModal}
/>

<SmallCard
  title="Nursing Handover"
  list={handoverCases}
  icon={<ClipboardList size={34} />}
  color="#d5b337"
  onViewAll={openCaseModal}
/>

<CTWorkflowCard
  pendingCases={pendingCTCases}
  awaitReportCases={awaitReportCases}
  onCaseClick={setCtModal}
  onViewAll={openCaseModal}
/>

<SmallCard
  title="Q1H Monitoring"
  list={q1hCases}
  icon={<Clock3 size={34} />}
  color="#245C8F"
  onViewAll={openCaseModal}
extraButton={
  <div className="flex gap-2">

  <button
    onClick={() => setQ1hModal(true)}
    className="px-4 py-2 rounded-xl bg-[#DBEAFE] text-[#245C8F] font-bold"
  >
    Add
  </button>
  <button
    onClick={() => setDropQ1hModal(true)}
    className="px-4 py-2 rounded-xl bg-[#DBEAFE] text-[#245C8F] font-bold"
  >
    Drop
  </button>
</div>
  }
/>
</div>

     <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

  {/* LEFT SIDE */}
  <div className="w-full">
   <div className="mb-2">
      <h2 className="text-3xl font-bold whitespace-nowrap mb-4">
        Patient List
      </h2>

      <input
    type="text"
    placeholder="Search Bed / Handover / Remarks"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="border border-gray-300 rounded-2xl px-4 py-3
               w-[220px] md:w-[360px]
               shadow-sm outline-none
               focus:ring-2 focus:ring-[#0078AE]"
  />
</div>

    {/* MOBILE: view buttons under search */}
    <div className="flex md:hidden gap-3 mb-4">
     <div className="flex w-full md:w-auto gap-3">
      <button
        onClick={() => setViewMode('table')}
       className={`flex-1 md:flex-none px-5 py-3 rounded-2xl font-bold ${
          viewMode === 'table'
            ? 'bg-[#0078AE] hover:bg-[#00638F] text-white'
            : 'bg-white text-gray-500 border'
        }`}
      >
        Table View
      </button>
       <button
        onClick={() => setViewMode('bed')}
        className={`flex-1 md:flex-none px-5 py-3 rounded-2xl font-bold ${
          viewMode === 'bed'
            ? 'bg-[#0078AE] hover:bg-[#00638F] text-white'
            : 'bg-white text-gray-500 border'
        }`}
      >
        Bed View
      </button>
      </div>
    </div>
  </div>

  {/* RIGHT SIDE - DESKTOP ONLY */}
  <div className="hidden md:flex flex-col items-end gap-3">
    {/* View buttons */}
    <div className="flex gap-3">
      <button
        onClick={() => setViewMode('table')}
       className={`w-[120px] h-[48px] rounded-2xl font-bold flex items-center justify-center ${
          viewMode === 'table'
            ? 'bg-[#0078AE] hover:bg-[#00638F] text-white'
            : 'bg-white text-gray-500 border'
        }`}
      >
        Table View
      </button>
       <button
        onClick={() => setViewMode('bed')}
       className={`w-[120px] h-[48px] rounded-2xl font-bold flex items-center justify-center ${
          viewMode === 'bed'
            ? 'bg-[#0078AE] hover:bg-[#00638F] text-white'
            : 'bg-white text-gray-500 border'
        }`}
      >
        Bed View
      </button>
    </div>

    {/* Sorting under view buttons */}
    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
      className="bg-white border border-gray-300 rounded-2xl px-5 py-3 font-bold text-gray-700 shadow-sm"
    >
      <option value="time_desc">Time: New to Old</option>
      <option value="time_asc">Time: Old to New</option>
      <option value="cat_asc">Category 1 → 5</option>
      <option value="cat_desc">Category 5 → 1</option>
      <option value="status">Status</option>
    </select>
  </div>

  {/* MOBILE: sorting under view buttons */}
  <div className="md:hidden w-full">
    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
      className="w-full bg-white border border-gray-300 rounded-2xl px-5 py-3 font-bold text-gray-700 shadow-sm"
    >
      <option value="time_desc">Time: New to Old</option>
      <option value="time_asc">Time: Old to New</option>
      <option value="cat_asc">Category 1 → 5</option>
      <option value="cat_desc">Category 5 → 1</option>
      <option value="status">Status</option>
    </select>
  </div>

</div>

         {viewMode === 'table' && (
  <div className="bg-white rounded-3xl shadow overflow-x-auto">
         <table className="min-w-[1100px] w-full border-collapse overflow-hidden rounded-3xl">

  <thead>
    <tr className="bg-[#0078AE] text-white">

      <th className="p-5 border border-gray-300">Bed</th>
      <th className="p-5 border border-gray-300">Gender</th>
      <th className="p-5 border border-gray-300">Age</th>
      <th className="p-5 border border-gray-300">Category</th>
      <th className="p-5 border border-gray-300">Acknowledge</th>
<th className="p-5 border border-gray-300">VS</th>
<th className="p-5 border border-gray-300">Time in Obs.</th>
<th className="p-5 border border-gray-300">Status</th>
<th className="p-5 border border-gray-300">Handover</th>
<th className="p-5 border border-gray-300">Actions</th>

    </tr>
  </thead>

  <tbody>

    {filteredCases.map((item, index) => (

     <tr
  key={item.id}
  onClick={() => {
    setDetailModal(item)
    setHandoverChecks(item.handover_done || {})
  }}
  className="bg-white hover:bg-gray-50 transition cursor-pointer"
>

        <td className="p-5 border border-gray-200">
  <div className="font-bold text-[#245C8F]">
    {item.bed_no}
  </div>

  {item.ae_suffix && (
    <div className="mt-1 whitespace-nowrap text-[11px] font-semibold tracking-wider text-gray-500">
      AE•••••{item.ae_suffix}
    </div>
  )}
</td>

        <td className="p-5 border border-gray-200">
  <div className="flex items-center justify-center gap-2">
    {item.gender === 'M' ? (
      <>
        <Mars size={22} className="text-[#2F80ED]" />
        <span className="font-bold text-[#2F80ED]">M</span>
      </>
    ) : (
      <>
        <Venus size={22} className="text-[#D94F70]" />
        <span className="font-bold text-[#D94F70]">F</span>
      </>
    )}
  </div>
</td>

        <td className="p-5 border border-gray-200">
          {item.age}
        </td>

        <td className="p-5 border border-gray-200 text-center align-middle">
          <CategoryBadge category={item.category} />
        </td>



       <td className="p-5 border border-gray-200">
  <AckStatus acknowledgedAt={item.acknowledged_at} />
</td>

<td className="p-5 border border-gray-200">
  <VSStatus
  acknowledgedAt={item.acknowledged_at}
  vsTakenAt={item.vs_taken_at}
/>
</td>

<td className="p-5 border border-gray-200">
  <TimeInObs createdAt={item.created_at} />
</td>

<td className="p-5 border border-gray-200">
  <ObservationStatus
    status={
      !item.acknowledged_at
        ? 'pending_ack'
        : !item.vs_taken_at
          ? 'pending_vs'
          : 'in_observation'
    }
  />
</td>

<td className="p-5 border border-gray-200 relative">
  {item.nursing_handover ? (
    <div className="relative group inline-block">
      <div className="flex flex-wrap gap-2">
  {item.nursing_handover
    ?.split(',')
    .map((handover, index) => {
      const text = handover.trim()
      const isCT = isCTTag(text)
      const done = !isCT && item.handover_done?.[text]
      const ctMeta = getCTStatusMeta(item.ct_status)

      return (
        <div
          key={index}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold ${
            isCT
              ? ctMeta.tagClass
              : done
                ? 'bg-green-100 text-green-700'
                : 'bg-[#F3EBCF] text-[#9A6E00]'
          }`}
        >
          <span>{text}</span>

          {done && (
            <span className="text-green-600">
              ✓
            </span>
          )}

          {isCT && (
            <CTStatusBadge status={item.ct_status} />
          )}
        </div>
      )
    })}
</div>

      <div
  className={`
    hidden group-hover:block absolute left-0 z-50
    ${
      index >= filteredCases.length - 2
        ? 'bottom-full mb-2'
        : 'top-full mt-3'
    }
    w-72 bg-white rounded-2xl shadow-2xl
    border border-gray-200 p-4 z-50
  `}
>
        <p className="text-xs font-bold text-gray-400 uppercase mb-1">
          Remarks
        </p>

        <p className="text-sm text-gray-900 whitespace-pre-wrap">
          {item.remarks || '-'}
        </p>
      </div>
    </div>
  ) : '-'}
</td>
<td className="p-5 border border-gray-200">
  <div className="flex gap-2">

    <button
  disabled={!!item.acknowledged_at}
  onClick={() =>
    setActionModal({ type: 'ack', item })
  }
  className={`px-4 py-2 rounded-2xl font-bold transition ${
    item.acknowledged_at
      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
      : 'bg-[#DCFCE7] text-[#15803D]'
  }`}
  onClick={(e) => {
  e.stopPropagation()
  setActionModal({ type: 'ack', item })
}}
>
  Ack
</button>

    <button
  disabled={
    !!item.vs_taken_at ||
    !item.acknowledged_at
  }
  onClick={() =>
    setActionModal({ type: 'vs', item })
  }
  className={`px-4 py-2 rounded-2xl font-bold transition ${
    item.vs_taken_at
      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
      : !item.acknowledged_at
      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
      : 'bg-[#DBEAFE] text-[#1D4ED8]'
  }`}
  onClick={(e) => {
  e.stopPropagation()
  setActionModal({ type: 'vs', item })
}}
>
  VS
</button>
  <button
  type="button"
  onClick={(e) => {
    e.stopPropagation()
    setActionModal({ type: 'dc', item })
  }}
  className={`px-4 py-2 rounded-2xl font-bold transition ${
    item.acknowledged_at && item.vs_taken_at
      ? 'bg-red-100 text-red-700 hover:bg-red-200'
      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
  }`}
>
  D/C
</button>

  </div>
</td>
      </tr>

    ))}

  </tbody>

</table>
</div>
)}


{viewMode === 'bed' && (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    {filteredCases.map((item) => (
      <BedCaseCard
  key={item.id}
  item={item}
  setDetailModal={setDetailModal}
  setHandoverChecks={setHandoverChecks}
  setActionModal={setActionModal}
/>
    ))}
  </div>
)}

      
       {modalCases.length > 0 && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]">
      <div className="bg-white rounded-3xl p-8 w-[500px] shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{modalTitle}</h2>

          <button
            onClick={() => setModalCases([])}
            className="text-3xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
         {modalCases.map((item) => (
  <div
    key={item.id}
    className="relative group"
  >

    <div className="bg-gray-100 rounded-2xl p-4 text-center font-bold text-xl cursor-pointer hover:bg-gray-200 transition">
      {item.bed_no}
    </div>

    <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-full mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 z-50">

      <p className="text-xs font-bold text-gray-400 uppercase mb-1">
        Nursing Handover
      </p>

      <p className="text-sm text-gray-900 mb-4 whitespace-pre-wrap">
        {item.nursing_handover || '-'}
      </p>

      <p className="text-xs font-bold text-gray-400 uppercase mb-1">
        Remarks
      </p>

      <p className="text-sm text-gray-900 whitespace-pre-wrap">
        {item.remarks || '-'}
      </p>

    </div>

  </div>
))}
        </div>
      </div>
    </div>
       )}
       {actionModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]">
    
    <div className="bg-white rounded-3xl p-8 w-[520px] shadow-2xl">

      <div className="bg-[#0078AE] text-white rounded-2xl p-5 mb-6">
  <h2 className="text-3xl font-bold">
    {actionModal.type === 'ack'
      ? 'Confirm Acknowledgement'
      : actionModal.type === 'vs'
      ? 'Confirm Vital Sign'
      : 'Confirm Discharge'}
  </h2>

  <p className="text-white/80 mt-1">
    Bed {actionModal.item.bed_no}
  </p>
</div>

{actionModal.type === 'dc' &&
  getDischargeWarnings(actionModal.item).length > 0 && (
    <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-2xl p-5">
      <p className="text-red-700 text-lg font-bold mb-3">
        Incomplete nursing actions
      </p>

      <div className="space-y-2">
        {getDischargeWarnings(actionModal.item).map(
          (warning, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-red-700 font-semibold"
            >
              <span>⚠</span>
              <span>{warning}</span>
            </div>
          )
        )}
      </div>

      <p className="text-red-600 text-sm font-semibold mt-4">
        Confirm to force discharge this case?
      </p>
    </div>
  )}

      <div className="space-y-3 mb-6">

        <div className="bg-gray-100 rounded-2xl p-4">
          <div className="text-sm text-gray-500">
            Bed Number
          </div>

          <div className="text-2xl font-bold">
            {actionModal.item.bed_no}
          </div>
        </div>

        <div className="bg-gray-100 rounded-2xl p-4">
          <div className="text-sm text-gray-500">
            Category
          </div>

          <div className="font-bold">
            {actionModal.item.category}
          </div>
        </div>

        <div className="bg-gray-100 rounded-2xl p-4">
          <div className="text-sm text-gray-500">
            Handover
          </div>

          <div className="font-bold">
            {actionModal.item.nursing_handover || '-'}
          </div>
        </div>

      </div>

      <div className="flex justify-end gap-3">

        <button
          onClick={() => setActionModal(null)}
          className="px-5 py-3 rounded-2xl bg-gray-200 font-bold"
        >
          Cancel
        </button>

        <button
  type="button"
  onClick={confirmAction}
  className={`px-5 py-3 rounded-2xl text-white font-bold ${
    actionModal.type === 'dc'
      ? getDischargeWarnings(actionModal.item).length > 0
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-[#0078AE] hover:bg-[#00638F]'
      : 'bg-[#0078AE] hover:bg-[#00638F]'
  }`}
>
  {actionModal.type === 'ack'
    ? 'Confirm Acknowledgement'
    : actionModal.type === 'vs'
    ? 'Confirm VS'
    : getDischargeWarnings(actionModal.item).length > 0
    ? 'Force D/C'
    : 'Confirm D/C'}
</button>

      </div>

    </div>

  </div>
)}
    </div>

    {changeBedModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
   onClick={() => {
  setChangeBedModal(null)
  setNewBedNo('')
  setChangeBedError('')
}}
  >
    <div
      className="bg-white rounded-3xl p-8 w-[90vw] max-w-[420px] shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0078AE]">
          Change Bed
        </h2>

         <button
    onClick={() => {
      setChangeBedModal(null)
      setNewBedNo('')
      setChangeBedError('')
    }}
    className="text-3xl font-bold text-gray-400"
  >
    ✕
  </button>
</div>

      <p className="text-gray-500 mb-3">
        Current Bed
      </p>

      <div className="bg-gray-100 rounded-2xl p-4 font-bold text-xl mb-6">
        Bed {changeBedModal.bed_no}
      </div>

      <p className="text-gray-500 mb-3">
        New Bed Number
      </p>

     <input
  value={newBedNo}
  onChange={(e) => {
    setNewBedNo(e.target.value)
    setChangeBedError('')
  }}
  placeholder="Enter New Bed Number"
  className={`w-full rounded-2xl px-4 py-4 text-xl mb-2 border ${
    changeBedError
      ? 'border-red-400'
      : 'border-gray-300'
  }`}
/>

{changeBedError && (
  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 font-semibold">
    {changeBedError}
  </div>
)}

      <button
        onClick={handleChangeBed}
        disabled={!newBedNo.trim()}
        className={`w-full py-4 rounded-2xl text-xl font-bold text-white ${
          newBedNo.trim()
            ? 'bg-[#0078AE] hover:bg-[#00638F]'
            : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        Confirm Change Bed
      </button>
    </div>
  </div>
)}
    {detailModal && (
<div
  className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
  onClick={() => setDetailModal(null)}
>
    <div
  className="bg-white rounded-3xl p-8 w-[500px] shadow-2xl"
  onClick={(e) => e.stopPropagation()}
>

      <div className="flex justify-between items-center mb-6">
        <div>
  <h2 className="text-2xl font-bold text-[#0078AE]">
    Bed {detailModal.bed_no}
  </h2>

  {detailModal.ae_suffix && (
    <p className="mt-1 text-xs font-semibold tracking-wider text-gray-500">
      AE•••••{detailModal.ae_suffix}
    </p>
  )}
</div>

        <button
          onClick={() => setDetailModal(null)}
          className="text-3xl font-bold text-gray-400 hover:text-black"
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
  <span className="font-bold">
    Cat {detailModal.category}
  </span>
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
        .map((item, index) => {
          const text = item.trim()
          const isCT =
  text.toUpperCase() === 'CT' ||
  text.toUpperCase() === 'CTB'

          if (!text) return null

return (
  <div key={index} className="space-y-3">
    {isCT ? (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
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
          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3">
            <input
              type="radio"
              name="ct-status"
              value="pending_ct"
              checked={
                !detailModal.ct_status ||
                detailModal.ct_status === 'pending_ct'
              }
              onChange={() => {
                setDetailModal((prev) => ({
                  ...prev,
                  ct_status: 'pending_ct'
                }))
              }}
            />

            <span className="font-semibold text-gray-800">
              Pending CT
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3">
            <input
              type="radio"
              name="ct-status"
              value="await_report"
              checked={
                detailModal.ct_status === 'await_report'
              }
              onChange={() => {
                setDetailModal((prev) => ({
                  ...prev,
                  ct_status: 'await_report'
                }))
              }}
            />

            <span className="font-semibold text-gray-800">
              Await Report
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3">
            <input
              type="radio"
              name="ct-status"
              value="completed"
              checked={
                detailModal.ct_status === 'completed'
              }
              onChange={() => {
                setDetailModal((prev) => ({
                  ...prev,
                  ct_status: 'completed'
                }))
              }}
            />

            <span className="font-semibold text-gray-800">
              Report Reviewed — Completed
            </span>
          </label>
        </div>
      </div>
    ) : (
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={handoverChecks[text] || false}
          onChange={(event) => {
            setHandoverChecks((prev) => ({
              ...prev,
              [text]: event.target.checked
            }))
          }}
        />

        <span>{text}</span>
      </label>
    )}
  </div>
)
        })}

      <button
onClick={async () => {
  const now = new Date().toISOString()

  const handoverItems = String(
    detailModal.nursing_handover || ''
  )
    .split(',')
    .map((item) => item.trim().toUpperCase())

  const hasCT =
    handoverItems.includes('CT') ||
    handoverItems.includes('CTB')

  const updatePayload = {
    handover_done: handoverChecks
  }

  if (hasCT) {
    updatePayload.ct_status =
      detailModal.ct_status || 'pending_ct'

    updatePayload.ct_updated_at = now
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

  setDetailModal(null)
  await fetchCases()
}}
        className="w-full mt-6 bg-[#0078AE] text-white py-3 rounded-2xl font-bold hover:bg-[#00638F]"
      >
        Save Checklist
      </button>
    </div>
  </div>
)}

<button
  onClick={() => {
  setChangeBedModal(detailModal)
  setNewBedNo('')
  setChangeBedError('')
  setDetailModal(null)
}}
  className="w-full mt-3 bg-gray-200 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-300"
>
  Change Bed
</button>

          </div>
        </div>

      </div>
)}
{q1hModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
    onClick={() => setQ1hModal(false)}
  >
    <div
      className="bg-white rounded-3xl p-8 w-[520px] shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#245C8F]">
          Add Q1H Monitoring
        </h2>

        <button
          onClick={() => setQ1hModal(false)}
          className="text-3xl font-bold text-gray-400"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {activeCases
          .filter((item) => !item.q1h_monitoring)
          .map((item) => (
            <button
              key={item.id}
              onClick={() => addQ1H(item.id)}
              className="bg-gray-100 hover:bg-[#DBEAFE] text-[#245C8F] rounded-2xl py-4 font-bold text-xl"
            >
              {item.bed_no}
            </button>
          ))}
      </div>
    </div>
  </div>
)}
{dropQ1hModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
    onClick={() => setDropQ1hModal(false)}
  >
    <div
      className="bg-white rounded-3xl p-8 w-[520px] shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-red-600">
          Drop Q1H Monitoring
        </h2>

        <button
          onClick={() => setDropQ1hModal(false)}
          className="text-3xl font-bold text-gray-400"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {activeCases
          .filter((item) => item.q1h_monitoring)
          .map((item) => (
            <button
              key={item.id}
              onClick={() => dropQ1H(item.id)}
              className="bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl py-4 font-bold text-xl"
            >
              {item.bed_no}
            </button>
          ))}
      </div>
    </div>
  </div>
)}

{ctModal && (
  <div
    className="
      fixed inset-0 z-[100]
      flex items-center justify-center
      bg-black/40 p-4
    "
    onClick={() => setCtModal(null)}
  >
    <div
      className="
        w-full max-w-md
        rounded-3xl bg-white
        p-6 shadow-2xl
      "
      onClick={(event) => event.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wider text-gray-400">
            CT STATUS
          </p>

          <h2 className="mt-1 text-3xl font-bold text-[#0078AE]">
            Bed {ctModal.bed_no}
          </h2>

          {ctModal.ae_suffix && (
            <p className="mt-1 text-sm text-gray-500">
              AE•••••{ctModal.ae_suffix}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCtModal(null)}
          className="
            flex h-10 w-10
            items-center justify-center
            rounded-xl bg-gray-100
            font-bold text-gray-500
          "
        >
          ✕
        </button>
      </div>

      {/* Current Status */}
      <div className="mt-6 rounded-2xl bg-gray-50 p-4">
        <p className="text-xs font-bold uppercase text-gray-400">
          Current status
        </p>

        <div className="mt-2">
          <CTStatusBadge status={ctModal.ct_status} />
        </div>
      </div>

      {/* Patient information */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-400">
            Category
          </p>

          <p className="mt-1 font-bold text-gray-900">
            {ctModal.category
              ? `CAT ${ctModal.category}`
              : '-'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-400">
            Handover
          </p>

          <p className="mt-1 truncate font-bold text-gray-900">
            {ctModal.nursing_handover || '-'}
          </p>
        </div>
      </div>

      {/* 暫時未有功能嘅 status button */}
      <div className="mt-6">
        {ctModal.ct_status === 'await_report' ? (
          <button
  type="button"
  disabled={ctUpdating}
  onClick={() =>
  updateDashboardCTStatus(
    CT_STATUS.COMPLETED
  )
}
  className="
    w-full rounded-2xl
    bg-green-600 px-5 py-4
    font-bold text-white
    transition
    hover:bg-green-700
    active:scale-[0.99]
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
>
  {ctUpdating
    ? 'Updating...'
    : 'Report Reviewed — Complete'}
</button>
        ) : (
<button
  type="button"
  disabled={ctUpdating}
  onClick={() =>
  updateDashboardCTStatus(
    CT_STATUS.AWAIT_REPORT
  )
}
  className="
    w-full rounded-2xl
    bg-[#C94B4B] px-5 py-4
    font-bold text-white
    transition
    hover:bg-[#B53F3F]
    active:scale-[0.99]
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
>
  {ctUpdating
    ? 'Updating...'
    : 'CT Completed — Await Report'}
</button>
        )}

        <button
          type="button"
          onClick={() => setCtModal(null)}
          className="
            mt-3 w-full rounded-2xl
            border border-gray-300
            px-5 py-4
            font-bold text-gray-600
          "
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

<BottomNav />

    </div>


  )
}


function SummaryCard({ title, value }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-4xl font-bold mt-2">{value}</p>
    </div>
  )
}

function BedBlock({
  bed,
  color = '#F3F4F6',
  textColor = '#4B5563',
  blink = false
}) {
  return (
    <div
      className="min-w-[70px] h-[54px] flex items-center justify-center rounded-2xl text-xl font-bold shadow-sm"
      style={{
        backgroundColor: color,
        color: textColor,
        animation: blink ? 'pulse 1s infinite' : 'none',
        transform: blink ? 'scale(1)' : 'none'
      }}
    >
      {bed}

      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.18);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
function RiskWorkflowCard({
  fallRiskCases,
  headInjuryCases,
  onViewAll
}) {
  const fallRiskPreview =
    fallRiskCases.slice(0, 8)

  const headInjuryPreview =
    headInjuryCases.slice(0, 8)

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow">
      {/* Fall Risk */}
      <div className="p-6">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-[#6C4AB6]">
            <ShieldAlert size={34} />
          </div>

          <div>
            <p className="text-lg font-bold text-gray-900">
              Fall Risk
            </p>

            <p className="mt-1 text-4xl font-bold text-[#6C4AB6]">
              {fallRiskCases.length}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {fallRiskPreview.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-purple-50 px-3 py-2 text-sm font-bold text-[#6C4AB6]"
            >
              {item.bed_no}
            </div>
          ))}

          {fallRiskCases.length === 0 && (
            <p className="text-sm text-gray-400">
              No fall risk
            </p>
          )}
        </div>

        {fallRiskCases.length > 8 && (
          <button
            type="button"
            onClick={() =>
              onViewAll(
                'Fall Risk',
                fallRiskCases
              )
            }
            className="mt-3 text-sm font-bold text-[#6C4AB6]"
          >
            View All ›
          </button>
        )}
      </div>

      <div className="border-t border-gray-200" />

      {/* Head Injury */}
      <div className="p-6">
        <div className="flex items-center gap-5">
<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[#C97916]">
  <Brain size={34} />
</div>

          <div>
            <p className="text-lg font-bold text-gray-900">
              Head Injury
            </p>

<p className="mt-1 text-4xl font-bold text-[#C97916]">
  {headInjuryCases.length}
</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {headInjuryPreview.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-[#C97916]"
            >
              {item.bed_no}
            </div>
          ))}

        </div>

        {headInjuryCases.length > 8 && (
          <button
            type="button"
            onClick={() =>
              onViewAll(
                'Head Injury',
                headInjuryCases
              )
            }
            className="mt-3 text-sm font-bold text-[#C97916]"
          >
            View All ›
          </button>
        )}
      </div>
    </div>
  )
}

function CTWorkflowCard({
  pendingCases,
  awaitReportCases,
  onCaseClick,
  onViewAll
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow">
      {/* Card Header */}
      <div className="flex items-center gap-4 px-5 pt-5 pb-4">
        <div
          className="
            flex h-14 w-14
            items-center justify-center
            rounded-2xl
          "
          style={{
            backgroundColor: '#FDECEC',
            color: '#C94B4B'
          }}
        >
          <ScanLine size={34} />
        </div>

        <div>
          <p className="text-xl font-bold text-gray-900">
            CT
          </p>

        </div>
      </div>

      {/* Pending CT */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-800">
            Pending CT
          </p>

          <p className="text-2xl font-bold text-[#C94B4B]">
            {pendingCases.length}
          </p>
        </div>

        <div className="mt-3 flex min-h-[40px] flex-wrap gap-2">
         {pendingCases.slice(0, 8).map((item) => (
  <button
    key={item.id}
    type="button"
    onClick={() => onCaseClick(item)}
    className="
      rounded-xl
      bg-red-50
      px-3 py-2
      text-sm font-bold
      text-[#C94B4B]
      transition
      hover:bg-red-100
      active:scale-95
    "
  >
   {item.bed_no}
  </button>
))}
        </div>
        {pendingCases.length > 8 && (
  <button
    type="button"
    onClick={() =>
      onViewAll('Pending CT', pendingCases)
    }
    className="mt-3 text-sm font-bold text-[#C94B4B]"
  >
    View All ›
  </button>
)}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Await Report */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-800">
            Await Report
          </p>

          <p className="text-2xl font-bold text-[#D58A20]">
            {awaitReportCases.length}
          </p>
        </div>

        <div className="mt-3 flex min-h-[40px] flex-wrap gap-2">
         {awaitReportCases.slice(0, 8).map((item) => (
  <button
    key={item.id}
    type="button"
    onClick={() => onCaseClick(item)}
    className="
      rounded-xl
      bg-orange-50
      px-3 py-2
      text-sm font-bold
      text-[#D58A20]
      transition
      hover:bg-orange-100
      active:scale-95
    "
  >
    {item.bed_no}
  </button>
))}
        </div>
        {awaitReportCases.length > 8 && (
  <button
    type="button"
    onClick={() =>
      onViewAll('Await Report', awaitReportCases)
    }
    className="mt-3 text-sm font-bold text-[#D58A20]"
  >
    View All ›
  </button>
)}
      </div>
    </div>
  )
}
function SmallCard({ title, list, icon, color, onViewAll, extraButton }) {
  const preview = list.slice(0, 8)

  return (
    <div className="relative bg-white rounded-3xl p-6 pb-24 shadow border border-gray-100">
      <div className="flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            backgroundColor: `${color}18`,
            color: color
          }}
        >
          {icon}
        </div>

        <div>
          <p className="font-bold text-lg text-gray-900">{title}</p>

          <p
            className="text-4xl font-bold mt-1"
            style={{ color: color }}
          >
            {list.length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {preview.map((item) => (
          <div key={item.id} className="relative group">
  
  <div
    className="px-3 py-2 rounded-xl font-bold text-sm cursor-pointer"
    style={{
      backgroundColor: `${color}18`,
      color: color
    }}
  >
    {item.bed_no}
  </div>

  <div className="hidden group-hover:block absolute left-0 top-full mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50">

    <p className="text-xs font-bold text-gray-400 uppercase mb-1">
      Nursing Handover
    </p>

    <p className="text-sm text-gray-900 mb-4">
      {item.nursing_handover || '-'}
    </p>

    <p className="text-xs font-bold text-gray-400 uppercase mb-1">
      Remarks
    </p>

    <p className="text-sm text-gray-900">
      {item.remarks || '-'}
    </p>

  </div>

</div>


        ))}
      
      </div>

      {list.length > 8 && (
        <button
          onClick={() => onViewAll(title, list)}
          className="mt-3 text-sm font-bold"
          style={{ color: color }}
        >
          View All ›
        </button>
      )}
{extraButton && (
  <div className="absolute bottom-6 right-6">
    {extraButton}
  </div>
)}
    </div>
  )
}
function BedCaseCard({
  item,
  setDetailModal,
  setHandoverChecks,
  setActionModal
}) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow hover:shadow-lg transition"><div
  onClick={() => {
    setDetailModal(item)
    setHandoverChecks(item.handover_done || {})
  }}
  className="bg-white rounded-3xl p-5 shadow hover:shadow-lg transition cursor-pointer"
>
      
      <div className="flex justify-between items-center mb-4">
        <div>
  <h2 className="text-3xl font-bold text-[#006B8F]">
    Bed {item.bed_no}
  </h2>

  {item.ae_suffix && (
    <p className="mt-1 text-xs font-semibold tracking-wider text-gray-500">
      AE•••••{item.ae_suffix}
    </p>
  )}
</div>

        <CategoryBadge category={item.category} />
      </div>

      <div className="space-y-3 text-sm">
        
        <div className="flex justify-between">
          <span className="text-gray-500">Gender</span>
          <div className="flex items-center gap-2"> {item.gender === 'M' ? ( <> <Mars size={18} className="text-[#2F80ED]" /> <span className="font-semibold text-[#2F80ED]">M</span> </> ) : ( <> <Venus size={18} className="text-[#EB5757]" /> <span className="font-semibold text-[#EB5757]">F</span> </> )} </div>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Age</span>
          <span className="font-semibold">{item.age}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>

          <span
            className={`px-3 py-1 rounded-full text-sm font-bold ${
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

        <div>
          <div className="text-gray-500 mb-1">Handover</div>

          <div className="flex flex-wrap gap-2">
           {item.nursing_handover
  ?.split(',')
  .map((tag, index) => {
    const text = tag.trim()
    const isCT = isCTTag(text)
    const done = !isCT && item.handover_done?.[text]
    const ctMeta = getCTStatusMeta(item.ct_status)

    return (
      <span
        key={index}
        className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
          isCT
            ? ctMeta.tagClass
            : done
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
        }`}
      >
        {text}

        {done && (
          <span className="text-green-600 text-[10px]">
            ✔
          </span>
        )}

        {isCT && (
          <CTStatusBadge status={item.ct_status} compact />
        )}
      </span>
    )
  })}
          </div>
          <div className="flex gap-2 mt-5">
  <button
     onClick={(e) => {
    e.stopPropagation()
    setActionModal({ type: 'ack', item })
  }}
    className={`px-4 py-2 rounded-xl font-bold text-sm ${
      item.acknowledged_at
        ? 'bg-gray-200 text-gray-400'
        : 'bg-green-100 text-green-700 hover:bg-green-200'
    }`}
  >
    Ack
  </button>

  <button
    onClick={(e) => {
    e.stopPropagation()
    setActionModal({ type: 'vs', item })
  }}
    className={`px-4 py-2 rounded-xl font-bold text-sm ${
      !item.acknowledged_at || item.vs_taken_at
        ? 'bg-gray-200 text-gray-400'
        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    }`}
  >
    VS
  </button>

  <button
  type="button"
  onClick={(e) => {
    e.stopPropagation()
    setActionModal({ type: 'dc', item })
  }}
  className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
    item.acknowledged_at && item.vs_taken_at
      ? 'bg-red-100 text-red-700 hover:bg-red-200'
      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
  }`}
>
  D/C
</button>
</div>
        </div>
      </div>
    </div>
     </div>
  )
}
function CategoryBadge({ category }) {

  let bg = '#E5E7EB'
  let color = '#374151'

  if (category === '1' || category === '2') {
    bg = '#B4231820'
    color = '#B42318'
  } else if (category === '3') {
    bg = '#328ee455'
    color = '#1066b7'
  } else {
    bg = '#11111120'
    color = '#4f5054'
  }

  return (
    <span
     className="inline-flex items-center justify-center whitespace-nowrap px-4 py-2 rounded-2xl font-bold"
      style={{
        backgroundColor: bg,
        color: color
      }}
    >
      Cat {category}
    </span>
  )
}
function RiskBadge({ value }) {

  const isHigh = value === 'Yes'

  return (
    <span
      className="px-4 py-2 rounded-2xl font-bold"
      style={{
        backgroundColor: isHigh
          ? '#C94B4B20'
          : '#4F8A5B20',
        color: isHigh
          ? '#C94B4B'
          : '#4F8A5B'
      }}
    >
      {isHigh ? 'High' : 'Low'}
    </span>
  )
}
function AckStatus({ acknowledgedAt }) {

  const done = !!acknowledgedAt

  return (
    <div className="flex items-center gap-3">

      <div
        className={`w-4 h-4 rounded-full ${
          done ? 'bg-green-500' : 'bg-orange-500'
        }`}
      />

      <span className="font-semibold">
        {done ? 'Done' : 'Pending'}
      </span>

    </div>
  )
}
function VSStatus({ acknowledgedAt, vsTakenAt }) {
  if (!acknowledgedAt) {
    return <span className="text-gray-400 font-semibold">-</span>
  }

  const done = !!vsTakenAt

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-4 h-4 rounded-full ${
          done ? 'bg-green-500' : 'bg-orange-500'
        }`}
      />

      <span className="font-semibold">
        {done ? 'Done' : 'Pending'}
      </span>
    </div>
  )
}
function TimeInObs({ createdAt }) {

  const start = new Date(createdAt)
  const now = new Date()

  const diffMs = now - start

  const mins = Math.floor(diffMs / 60000)

  const hh = String(Math.floor(mins / 60)).padStart(2, '0')
  const mm = String(mins % 60).padStart(2, '0')

  return (
    <span className="font-semibold">
      {hh}:{mm}
    </span>
  )
}
function ObservationStatus({ status }) {

  let bg = '#DCFCE7'
  let color = '#15803D'
  let text = 'In Observation'

  if (status === 'pending_ack') {
    bg = '#FEE2E2'
    color = '#B42318'
    text = 'Pending Acknowledgement'
  }

if (status === 'pending_vs') {
  bg = '#FFEDD5'
  color = '#EA580C'
  text = 'Pending VS'
}

  if (status === 'overdue_vs') {
    bg = '#FEE2E2'
    color = '#DC2626'
    text = 'Overdue VS'
  }

 return (
  <span
    className={`inline-flex items-center justify-center whitespace-nowrap px-4 py-2 rounded-2xl font-bold ${
      text === 'Pending' ? 'animate-pulse' : ''
    }`}
    style={{ backgroundColor: bg, color }}
  >
    {text}
  </span>
)
}
