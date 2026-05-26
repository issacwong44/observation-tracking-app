'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Mars, Venus } from 'lucide-react'

export default function HandoverPage() {
  const [cases, setCases] = useState([])
  const [handoverNotes, setHandoverNotes] = useState({})
const saveTimers = useRef({})
const [saveStatus, setSaveStatus] = useState({})
const [isEditingNote, setIsEditingNote] = useState(false)
  const [detailModal, setDetailModal] = useState(null)
const [handoverChecks, setHandoverChecks] = useState({})
const [hideConfirmModal, setHideConfirmModal] = useState(null)
const [addHandoverModal, setAddHandoverModal] = useState(false)
const [sortOrder, setSortOrder] = useState('newest')

 useEffect(() => {
  fetchCases()

  const interval = setInterval(() => {
    if (!isEditingNote) {
      fetchCases()
    }
  }, 5000)

  return () => clearInterval(interval)
}, [isEditingNote])

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
function isStayOvernightBed(bedNo) {
  const num = Number(bedNo)
  return num >= 1 && num <= 10
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
  return (
    <main className="min-h-screen bg-[#F5F5F7] pb-28">
      {/* Header */}
      <div className="h-20 md:h-28 bg-[#0078AE] text-white shadow-sm px-5 md:px-8 flex flex-col justify-center">
  <h1 className="text-xl md:text-3xl font-bold">
    Handover
  </h1>

  <p className="text-sm md:text-lg text-white/80">
    Observation handover board
  </p>
</div>

    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 md:mt-8 mb-4 md:mb-6 px-4 md:px-8">
  <Link
    href="/dashboard"
    className="inline-flex items-center gap-2 text-[#0078AE] font-bold"
  >
    ← Back to Dashboard
  </Link>

  <select
  value={sortOrder}
  onChange={(e) => setSortOrder(e.target.value)}
 className="w-full md:w-auto bg-white border border-gray-300 rounded-2xl px-4 md:px-5 py-3 text-base md:text-lg font-bold text-gray-700 shadow-md outline-none"
>
    <option value="newest">Time: New to Old</option>
    <option value="oldest">Time: Old to New</option>
    <option value="cat_high">Category: Cat 1 → Cat 5</option>
<option value="cat_low">Category: Cat 5 → Cat 1</option>
  </select>
</div>
        <div className="bg-white rounded-[28px] md:rounded-[36px] shadow-sm border border-gray-200 overflow-hidden">

         <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] min-h-[calc(100vh-190px)]">

            {/* Left side */}
            <div className="order-2 md:order-1 md:border-r border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] bg-gray-50 border-b border-gray-200">
                <div className="p-4 md:p-6 font-bold text-[#0078AE]">
                  Bed Card
                </div>
                <div className="p-4 md:p-6 font-bold text-gray-500 flex items-center justify-between">
  <span>Handover Notes</span>

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
    ? item.nursing_handover.split(',').map((tag) => tag.trim())
    : []

  const allHandoverDone =
    handoverTags.length > 0 &&
    handoverTags.every((tag) => item.handover_done?.[tag])

  return (
  <div
    key={item.id}
    onClick={() => {
      setDetailModal(item)
      setHandoverChecks(item.handover_done || {})
    }}
    className="grid grid-cols-1 md:grid-cols-[260px_1fr] border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition"
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
    allHandoverDone
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
              onClick={() => {
                setDetailModal(item)
                setHandoverChecks(item.handover_done || {})
              }}
             className="bg-yellow-100 text-yellow-700 px-4 md:px-5 py-2 rounded-2xl text-sm md:text-lg font-bold flex items-center gap-2"
            >
              <span>{text}</span>

              {done && (
                <span className="text-green-600 text-xl">
                  ✓
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

{detailModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
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

        <div className="flex justify-between">
          <span className="text-gray-500">Remarks</span>
          <span className="font-bold text-right">
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
              .map((tag, index) => {
                const text = tag.trim()

                return (
                  <label
                    key={index}
                    className="flex items-center gap-3 text-lg"
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
                      className="w-5 h-5"
                    />

                    <span>{text}</span>
                  </label>
                )
              })}
          </div>
        </div>

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
      </div>
    </div>
  </div>
)}
{hideConfirmModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]"
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
{addHandoverModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]"
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
      {/* Bottom nav */}
     <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-0 w-full px-4 z-50 pointer-events-none">
  <div className="grid grid-cols-3 gap-3 pointer-events-auto">

    <Link
      href="/dashboard"
      className="py-4 text-center font-bold rounded-3xl shadow-xl bg-white hover:bg-gray-300 text-gray-500 border"
    >
      HOME
    </Link>

    <Link
      href="/handover"
      className="py-4 text-center font-bold rounded-3xl shadow-xl bg-[#0078AE] hover:bg-[#00638F] text-white"
    >
      HANDOVER
    </Link>

    <Link
      href="/history"
      className="py-4 text-center font-bold rounded-3xl shadow-xl bg-white text-gray-500 hover:bg-gray-300 border"
    >
      HISTORY
    </Link>

  </div>
</div>
    </main>
  )
}