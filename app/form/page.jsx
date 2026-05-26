'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation' 

function FormContent() {

  const searchParams = useSearchParams()
  const bed = searchParams.get('bed')

const [gender, setGender] = useState('')
const [age, setAge] = useState('')
const [category, setCategory] = useState('')
const [missingRisk, setMissingRisk] = useState('Low')
const [psySpMissing, setPsySpMissing] = useState([])
const [fallRisk, setFallRisk] = useState('No')
const [headInjury, setHeadInjury] = useState('No')
const [q1h, setQ1h] = useState('No')
const [handover, setHandover] = useState([])
const [remarks, setRemarks] = useState('')
const [warningModal, setWarningModal] = useState(null)

const router = useRouter()

useEffect(() => {
  const staff = localStorage.getItem('staff')

  if (!staff) {
    const currentUrl =
      `/form?${searchParams.toString()}`

    router.push(
      `/login?redirect=${encodeURIComponent(currentUrl)}`
    )
  }
}, [])

async function handleSubmit(e) {
  e.preventDefault()

 const { data: existingBed } = await supabase
  .from('observation_cases')
  .select('*')
  .eq('bed_no', bed)
  .is('confirmed_dc_at', null)
  .maybeSingle()

if (existingBed) {
  setWarningModal(existingBed)
  return
}
  const { error } = await supabase
    .from('observation_cases')
    .insert([
      {
        bed_no: bed,

        gender: gender,
        age: age,
        category: category,

        fall_risk: fallRisk,
        missing_risk: psySpMissing.join(', '),

        head_injury: headInjury,
        q1h_monitoring: q1h,

        nursing_handover: handover.join(', '),

        remarks: remarks,

        status: 'pending_ack'
      }
    ])

  if (error) {
    console.log(error)
    alert('Error saving data')
  } else {
    alert('Case submitted')

    setGender('')
    setAge('')
    setCategory('')
    setFallRisk('No')
    setPsySpMissing([])
    setHeadInjury('No')
    setQ1h('No')
    setHandover([])
    setRemarks('')
  }
}

  return (
<div className="min-h-screen bg-[#f4f6f8] pb-40 px-4 py-4 md:px-8">

    <div className="bg-[#0078AE] hover:bg-[#00638F] px-4 md:px-6 py-4 md:py-5 shadow-lg rounded-2xl">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Observation Room Case Tracking
          </h1>

          <p className="text-white/80 mt-1">
            NDH AED
          </p>
        </div>

        <div className="text-white text-2xl font-bold">
          Bed {bed}
        </div>

      </div>

    </div>

    <div className="p-4 md:p-6">
     <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-bold mb-2">Gender</label>
          <div className="flex gap-3">
              <button
    type="button"
    onClick={() => setGender('M')}
    className={`flex-1 md:flex-none px-4 md:px-6 py-3 md:py-4 rounded-2xl text-lg md:text-xl transition ${
      gender === 'M'
        ? 'text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
    style={{
      backgroundColor: gender === 'M' ? '#245C8F' : undefined
    }}
  >
    M
  </button>

            <button
    type="button"
    onClick={() => setGender('F')}
   className={`flex-1 md:flex-none px-4 md:px-6 py-3 md:py-4 rounded-2xl text-lg md:text-xl transition ${
      gender === 'F'
        ? 'text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
    style={{
      backgroundColor: gender === 'F' ? '#B14E6A' : undefined
    }}
  >
    F
  </button>
          </div>
        </div>

        <div>
          <label className="block font-bold mb-2">Age</label>
          <input
            placeholder="Age"
            type="number"
            className="w-full border p-3 rounded-xl"
            onChange={(e) => setAge(e.target.value)}
          />
        </div>

<div className="grid grid-cols-5 gap-2 md:gap-3">

  {['1', '2', '3', '4', '5'].map((cat) => {

    const selected = category === cat

    let bgColor = '#E5E7EB'

    if (selected) {
      if (cat === '1' || cat === '2') {
        bgColor = '#B42318'
      } else if (cat === '3') {
        bgColor = '#245C8F'
      } else {
        bgColor = '#6B7280'
      }
    }

    return (
      <button
        key={cat}
        type="button"
        onClick={() => setCategory(cat)}
        className="p-4 rounded-2xl font-bold text-xl transition"
        style={{
          backgroundColor: bgColor,
          color: selected ? 'white' : '#374151'
        }}
      >
        Cat {cat}
      </button>
    )
  })}

</div>


        <div>
          <label className="block font-bold mb-2">PSY / SP / Missing</label>
          <div className="grid grid-cols-3 gap-3">
         {['PSY', 'SP', 'Missing'].map((value) => (
  <button
    key={value}
    type="button"
    onClick={() => {
      setPsySpMissing((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      )
    }}
    className={`px-4 py-4 rounded-2xl text-xl transition ${
      psySpMissing.includes(value)
        ? 'text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
    style={{
      backgroundColor: psySpMissing.includes(value)
        ? '#4F8A5B'
        : undefined
    }}
  >
    {value}
  </button>
))}
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div>
              <label className="block font-bold mb-2">Fall Risk</label>
              <div className="grid grid-cols-2 gap-3">
                {['Yes', 'No'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFallRisk(value)}
                   className={`w-full px-4 md:px-6 py-3 md:py-4 rounded-2xl text-lg md:text-xl border-2 transition ${
  fallRisk === value
    ? 'border-black bg-gray-200 text-black'
    : 'border-transparent bg-gray-200 text-gray-700'
}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-2">Head Injury</label>
              <div className="grid grid-cols-2 gap-3">
                {['Yes', 'No'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHeadInjury(value)}
                   className={`w-full px-4 md:px-6 py-3 md:py-4 rounded-2xl text-lg md:text-xl border-2 transition ${
  headInjury === value
    ? 'border-black bg-gray-200 text-black'
    : 'border-transparent bg-gray-200 text-gray-700'
}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-2">Q1H Monitoring</label>
              <div className="grid grid-cols-2 gap-3">
                {['Yes', 'No'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQ1h(value)}
                    className={`w-full px-4 md:px-6 py-3 md:py-4 rounded-2xl text-lg md:text-xl border-2 transition ${
  q1h === value
    ? 'border-black bg-gray-200 text-black'
    : 'border-transparent bg-gray-200 text-gray-700'
}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

       <div>
  <label className="block font-bold mb-2">Nursing Handover</label>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {['CTB', 'Urine', 'Hstix', 'IVF', 'AOM','Cardiac Mon', 'Restraint', 'Tracking tag', 'Others'].map((item) => (
  <button
    key={item}
    type="button"
    onClick={() => {
      setHandover((prev) =>
        prev.includes(item)
          ? prev.filter((x) => x !== item)
          : [...prev, item]
      )
    }}
    className={`w-full px-4 py-4 rounded-2xl text-lg transition ${
      handover.includes(item)
        ? 'text-black'
        : 'bg-gray-200 text-gray-700'
    }`}
    style={{
      backgroundColor: handover.includes(item)
        ? '#E3C86B'
        : undefined
    }}
      >
        {item}
      </button>
    ))}
  </div>
</div>

<div>
  <label className="block font-bold mb-2">Remarks</label>

  <textarea
    placeholder="Remarks / additional information"
    className="w-full border p-4 rounded-2xl"
    rows={3}
    value={remarks}
    onChange={(e) => setRemarks(e.target.value)}
  />
</div>

        <button
          type="submit"
          className="w-full bg-[#0078AE] hover:bg-[#00638F] text-white p-5 rounded-2xl font-bold text-xl"
        >
          Submit
        </button>

      </form>
    </div>
    {warningModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

    <div className="bg-white rounded-3xl p-8 w-[520px] shadow-2xl">

      <div className="bg-[#0078AE] text-white rounded-2xl p-5 mb-6">
        <h2 className="text-3xl font-bold">
          Duplicate Active Bed
        </h2>

        <p className="text-white/80 mt-1">
          Bed {warningModal.bed_no} already exists
        </p>
      </div>

      <div className="space-y-4">

        <div className="bg-gray-100 rounded-2xl p-4">
          <p className="text-gray-500">Category</p>
          <p className="font-bold text-xl">
            Cat {warningModal.category}
          </p>
        </div>

        <div className="bg-gray-100 rounded-2xl p-4">
          <p className="text-gray-500">Handover</p>
          <p className="font-bold text-xl">
            {warningModal.nursing_handover || '-'}
          </p>
        </div>

        <div className="bg-gray-100 rounded-2xl p-4">
          <p className="text-gray-500">Remarks</p>
          <p className="font-bold">
            {warningModal.remarks || '-'}
          </p>
        </div>

      </div>

      <div className="flex justify-end mt-8">

        <button
          onClick={() => setWarningModal(null)}
          className="px-6 py-3 rounded-2xl bg-gray-200 font-bold"
        >
          Close
        </button>

      </div>

    </div>

  </div>
)}
  </div>
  )
}
export default function FormPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FormContent />
    </Suspense>
  )
}