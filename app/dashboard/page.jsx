'use client'

import {
  UsersRound,
  ShieldAlert,
  ClipboardList,
  Brain,
  Clock3,
  CircleHelp,
  Mars,
  Venus
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
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
async function handleAcknowledge(id) {
  const { error } = await supabase
    .from('observation_cases')
    .update({
      acknowledged_at: new Date().toISOString(),
      status: 'in_observation'
    })
    .eq('id', id)

  if (!error) fetchCases()
}

async function handleVS(id) {
  const { error } = await supabase
    .from('observation_cases')
    .update({
      vs_taken_at: new Date().toISOString(),
      status: 'Pending VS'
    })
    .eq('id', id)

  if (!error) fetchCases()
}

async function handleDischarge(item) {

  const { error } = await supabase
    .from('observation_cases')
    .update({
      discharged_at: new Date().toISOString(),
      confirmed_dc_at: new Date().toISOString(),
      status: 'discharged'
    })
    .eq('id', item.id)

  if (!error) fetchCases()
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

 const headInjury = activeCases.filter(
  (item) => item.head_injury === true
)

const hiCases = activeCases.filter(
  (item) => item.head_injury === true
)

const q1hCases = activeCases.filter(
  (item) => item.q1h_monitoring === true
)

  const fallRisk = activeCases.filter(
    (item) => item.fall_risk === 'Yes'
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

<div className="bg-[#0078AE] hover:bg-[#00638F] px-4 md:px-8 py-4 md:py-6 shadow-lg">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

    <div>
      <h1 className="text-xl md:text-3xl font-bold text-white">
        Observation Room Tracking Dashboard
      </h1>

      <p className="text-white/80 mt-1 text-sm md:text-base">
        NDH AED
      </p>
    </div>

    <div className="text-left md:text-right">
      <p className="text-xs md:text-sm text-white">
        Current Time
      </p>

      <p className="text-base md:text-2xl font-bold text-white mt-1">
    {currentTime || '--'}
    </p>
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

 <SmallCard
  title="Fall Risk"
  list={fallRisk}
  icon={<ShieldAlert size={34} />}
  color="#6C4AB6"
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

<SmallCard
  title="HI"
  list={hiCases}
  icon={<Brain size={34} />}
  color="#C94B4B"
  onViewAll={openCaseModal}
/>

<SmallCard
  title="Q1H Monitoring"
  list={q1hCases}
  icon={<Clock3 size={34} />}
  color="#245C8F"
  onViewAll={openCaseModal}
  extraButton={
    <button
      onClick={() => setQ1hModal(true)}
      className="mt-3 px-4 py-2 rounded-xl bg-[#DBEAFE] text-[#245C8F] font-bold"
    >
      Add
    </button>
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

        <td className="p-5 border border-gray-200 font-bold text-[#245C8F]">
  {item.bed_no}
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
  <ObservationStatus status={item.status} />
</td>

<td className="p-5 border border-gray-200 relative">
  {item.nursing_handover ? (
    <div className="relative group inline-block">
      <div className="flex flex-wrap gap-2">
  {item.nursing_handover
    ?.split(',')
    .map((handover, index) => {
      const text = handover.trim()

      const done =
        item.handover_done?.[text]

      return (
        <div
          key={index}
          className="flex items-center gap-1 bg-[#F3EBCF] text-[#9A6E00] px-4 py-2 rounded-2xl font-bold"
        >
          <span>{text}</span>

          {done && (
            <span className="text-green-600">
              ✓
            </span>
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
  disabled={!item.acknowledged_at || !item.vs_taken_at}
  onClick={() => setActionModal({ type: 'dc', item })}
  className={`px-4 py-2 rounded-2xl font-bold ${
    item.acknowledged_at && item.vs_taken_at
      ? 'bg-[#FEE2E2] text-[#B91C1C]'
      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
  }`}
  onClick={(e) => {
  e.stopPropagation()
  setActionModal({ type: 'dc', item })
}}
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
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
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    
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
  onClick={confirmAction}
  className="px-5 py-3 rounded-2xl bg-[#0078AE] hover:bg-[#00638F] text-white font-bold"
>
  {actionModal.type === 'ack'
    ? 'Confirm Acknowledgement'
    : actionModal.type === 'vs'
    ? 'Confirm VS'
    : 'Confirm D/C'}
</button>

      </div>

    </div>

  </div>
)}
    </div>
    {detailModal && (
<div
  className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
  onClick={() => setDetailModal(null)}
>
    <div
  className="bg-white rounded-3xl p-8 w-[500px] shadow-2xl"
  onClick={(e) => e.stopPropagation()}
>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0078AE]">
          Bed {detailModal.bed_no}
        </h2>

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

        <div className="flex justify-between">
          <span className="text-gray-500">Remarks</span>
          <span className="font-bold">
            {detailModal.remarks || '-'}
          </span>
        </div>

        <div>
          <p className="text-gray-500 mb-3 font-semibold">
            Handover Checklist
          </p>

          <div className="space-y-3">

            {detailModal.nursing_handover
  ?.split(',')
  .map((item, index) => {
    const text = item.trim()

    return (
      <label
        key={index}
        className="flex items-center gap-3"
      >
        <input
  type="checkbox"
  checked={handoverChecks[text] || false}
  onChange={(e) => {
    setHandoverChecks({
      ...handoverChecks,
      [text]: e.target.checked
    })
  }}
/>
        <span>{text}</span>
      </label>
      
    )
    
  })}
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
  className="w-full mt-6 bg-[#0078AE] text-white py-3 rounded-2xl font-bold hover:bg-[#00638F]"
>
  Save Checklist
</button>
          </div>
        </div>

      </div>
    </div>
  </div>
)}
{q1hModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
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
function SmallCard({ title, list, icon, color, onViewAll, extraButton }) {
  const preview = list.slice(0, 6)

  return (
    <div className="relative bg-white rounded-3xl p-6 shadow border border-gray-100">
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
      <div className="fixed bottom-0 left-0 w-full px-4 pb-[env(safe-area-inset-bottom)] z-50">

  <div className="grid grid-cols-2 gap-3">

    <Link
      href="/dashboard"
      className="py-4 text-center font-bold rounded-3xl shadow-xl bg-[#0078AE] hover:bg-[#00638F] text-white"
    >
      HOME
    </Link>

    <Link
      href="/history"
      className="py-4 text-center font-bold rounded-3xl shadow-xl bg-white text-gray-500 border"
    >
      HISTORY
    </Link>

  </div>

</div>
      </div>

      {list.length > 6 && (
        <button
          onClick={() => onViewAll(title, list)}
          className="mt-3 text-sm font-bold"
          style={{ color: color }}
        >
          View All ›
        </button>
      )}
   {extraButton && (
  <div className="mt-4 flex justify-end">
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
        <h2 className="text-3xl font-bold text-[#006B8F]">
          Bed {item.bed_no}
        </h2>

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
              .map((tag, index) => (
                <span
  key={index}
  className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1"
>
  {tag}

  {item.handover_done?.[tag.trim()] && (
    <span className="text-green-600 text-[10px]">✔</span>
  )}
</span>
              ))}
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
     onClick={(e) => {
    e.stopPropagation()
    setActionModal({ type: 'dc', item })
  }}
    className={`px-4 py-2 rounded-xl font-bold text-sm ${
      !item.vs_taken_at
        ? 'bg-gray-200 text-gray-400'
        : 'bg-red-100 text-red-700 hover:bg-red-200'
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
    bg = '#FEF3C7'
    color = '#D97706'
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
