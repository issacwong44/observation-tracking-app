'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation' 
import BottomNav from '../components/BottomNav'
import { useStaff } from '../components/StaffProvider'
import { writeAuditLog } from '../../lib/auditLog'
import StaffHeaderInfo from '../components/StaffHeaderInfo'

function FormContent() {
  const router = useRouter()

  const {
    currentStaff,
    staffLoading
  } = useStaff()

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
const [diagnosis, setDiagnosis] = useState('')

const [ctRequired, setCtRequired] = useState('No')

const [successModal, setSuccessModal] = useState(false)
const [isSubmitting, setIsSubmitting] = useState(false)

const [aeSuffix, setAeSuffix] = useState('')

const diagnosisOptions = [
  'Chest pain',
  'Abdominal pain',
  'Dizziness',
  'Head injury',
  'Fall',
  'SOB',
  'Fever',
  'GE',
  'Hyperglycemia',
  'Hypoglycemia',
  'Unstable Emotion',
  'Self harm',
  'Drug overdose',
  'Others'
]

function getSpecialPadRoom(bedNo) {
  const normalizedBed = String(bedNo).trim()

  if (normalizedBed === '23') {
    return 'Pad Room 7'
  }

  if (normalizedBed === '24') {
    return 'Pad Room 7A'
  }

  return null
}

useEffect(() => {
  const storedAeSuffix =
    sessionStorage.getItem(
      'observation_ae_suffix'
    )

  if (!storedAeSuffix) return

  setAeSuffix(
    storedAeSuffix.trim().toUpperCase()
  )

  sessionStorage.removeItem(
    'observation_ae_suffix'
  )
}, [])

async function handleSubmit(e) {
  e.preventDefault()

  if (isSubmitting) return

  if (!currentStaff) {
    alert('Staff login session not found')
    router.replace(
      `/login?redirect=${encodeURIComponent(
        window.location.pathname +
        window.location.search
      )}`
    )
    return
  }

  setIsSubmitting(true)

  const normalizedAeSuffix =
    aeSuffix.trim().toUpperCase()

if (!ctRequired) {
  alert('Please select CT Yes or No')
  setIsSubmitting(false)
  return
}
    if (!normalizedAeSuffix) {
  alert('Please scan the AE barcode first')
   setIsSubmitting(false)
  return
}

if (!/^[A-Z0-9]{5}$/.test(normalizedAeSuffix)) {
  alert(
    'AE reference must contain exactly 5 letters or numbers'
  )
   setIsSubmitting(false)
  return
}

   const specialPadRoom = getSpecialPadRoom(bed)
  const submittedAt = new Date().toISOString()
  
  const { data: existingBed } = await supabase
    .from('observation_cases')
    .select('*')
    .eq('bed_no', bed)
    .is('confirmed_dc_at', null)
    .maybeSingle()

  if (existingBed) {
    setWarningModal(existingBed)
    setIsSubmitting(false)
    return
  }

  const { data: existingAe } = await supabase
    .from('observation_cases')
    .select('id, bed_no, ae_suffix')
    .eq('ae_suffix', normalizedAeSuffix)
    .is('confirmed_dc_at', null)
    .maybeSingle()

  if (existingAe) {
    alert(
      `This AE reference already exists at Bed ${existingAe.bed_no}`
    )
    setIsSubmitting(false)
    return
  }

const handoverWithoutCT = handover.filter(
  (item) =>
    item !== 'CT' &&
    item !== 'CTB'
)

const finalHandover =
  ctRequired === 'Yes'
    ? ['CT', ...handoverWithoutCT]
    : handoverWithoutCT

const hasNursingHandover =
  finalHandover.length > 0

const hasCT =
  ctRequired === 'Yes'
  
const { data: newCase, error } = await supabase
  .from('observation_cases')
  .insert([
    {
  bed_no: bed,

  ae_suffix:
  normalizedAeSuffix || null,

  gender: gender,
  age: age,
  category: category,
  diagnosis: diagnosis,

      fall_risk: fallRisk,
      missing_risk: psySpMissing.join(', '),

      head_injury: headInjury,
      q1h_monitoring: q1h,

      nursing_handover: finalHandover.join(', '),

ct_status: hasCT
  ? 'pending_ct'
  : null,

ct_updated_at: hasCT
  ? submittedAt
  : null,

remarks: remarks,

acknowledged_at: specialPadRoom
  ? submittedAt
  : null,

status: specialPadRoom
  ? 'in_observation'
  : 'pending_ack',

      handover_seen: hasNursingHandover
        ? false
        : true,

handover_seen_at: hasNursingHandover
  ? null
  : submittedAt,

created_by_staff_member_id:
  currentStaff.id,

created_by_staff_id:
  currentStaff.staffId,

created_by_staff_name:
  currentStaff.displayName,

initial_handover_by_staff_member_id:
  hasNursingHandover
    ? currentStaff.id
    : null,

initial_handover_by_staff_id:
  hasNursingHandover
    ? currentStaff.staffId
    : null,

initial_handover_by_staff_name:
  hasNursingHandover
    ? currentStaff.displayName
    : null
    }
  ])
  .select()
  .single()

  if (error) {
    console.log(error)
    alert('Error saving data')
    setIsSubmitting(false)
    return
  }
  if (newCase) {
  try {
    await writeAuditLog({
      staff: currentStaff,

      actionType:
        'OBS_CASE_CREATED',

      entityType:
        'observation_case',

      entityId:
        newCase.id,

      bedNo:
        newCase.bed_no,

      oldData: null,

      newData: {
        bed_no:
          newCase.bed_no,

        ae_suffix:
          newCase.ae_suffix,

        gender:
          newCase.gender,

        age:
          newCase.age,

        category:
          newCase.category,

        diagnosis:
          newCase.diagnosis,

        fall_risk:
          newCase.fall_risk,

        missing_risk:
          newCase.missing_risk,

        head_injury:
          newCase.head_injury,

        q1h_monitoring:
          newCase.q1h_monitoring,

        nursing_handover:
          newCase.nursing_handover,

        ct_status:
          newCase.ct_status,

        remarks:
          newCase.remarks
      },

      metadata: {
        createdFrom:
          'observation_form',

        initialHandoverIncluded:
          hasNursingHandover,

        specialPadRoom:
          specialPadRoom || null
      }
    })
  } catch (auditError) {
    console.error(
      'Observation case creation audit failed:',
      auditError
    )

    alert(
      'Case submitted, but audit log failed'
    )
  }
}

  if (newCase && psySpMissing.length > 0) {
  const { error: psyError } = await supabase
    .from('psy_handover_cases')
const {
  data: newPsyCase,
  error: psyInsertError
} = await supabase
  .from('psy_handover_cases')
  .insert([
    {
      observation_case_id:
        newCase.id,

      bed_no:
        bed,

      ae_suffix:
        normalizedAeSuffix || null,

      patient_label:
        normalizedAeSuffix
          ? `AE•••••${normalizedAeSuffix}`
          : `Bed ${bed}`,

      gender,
      age,

      chief_complaint:
        diagnosis,

      location:
        specialPadRoom
          ? specialPadRoom
          : 'Cubicle',

      risk_type:
        psySpMissing.join(', '),

      status:
        'Pending Doctor Consultation',

      progress: '',
      outcome: '',
      miscellaneous:
        remarks || '',
      free_text: '',

      source:
        'observation_form',

      handover_hidden:
        false,

      updated_by_staff_member_id:
        currentStaff.id,

      updated_by_staff_id:
        currentStaff.staffId,

      updated_by_staff_name:
        currentStaff.displayName,

      updated_by_at:
        submittedAt,

      updated_at:
        submittedAt,

      last_action_type:
        'PSY_CASE_CREATED'
    }
  ])
  .select()
  .single()

    if (psyInsertError) {
     console.log(psyInsertError)
      alert('Observation case submitted, but psychiatric handover was not created')
      setIsSubmitting(false)
      return
    }
    if (newPsyCase) {
  try {
    await writeAuditLog({
      staff:
        currentStaff,

      actionType:
        'PSY_CASE_CREATED',

      entityType:
        'psy_handover_case',

      entityId:
        newPsyCase.id,

      bedNo:
        newPsyCase.bed_no,

      oldData:
        null,

      newData: {
        observation_case_id:
          newPsyCase.observation_case_id,

        bed_no:
          newPsyCase.bed_no,

        patient_label:
          newPsyCase.patient_label,

        gender:
          newPsyCase.gender,

        age:
          newPsyCase.age,

        chief_complaint:
          newPsyCase.chief_complaint,

        location:
          newPsyCase.location,

        risk_type:
          newPsyCase.risk_type,

        status:
          newPsyCase.status,

        source:
          newPsyCase.source
      },

      metadata: {
        createdFrom:
          'observation_form',

        linkedObservationCaseId:
          newCase.id
      }
    })
  } catch (auditError) {
    console.error(
      'Psychiatric case creation audit failed:',
      auditError
    )

    alert(
      'Psychiatric case created, but audit log failed'
    )
  }
}
  }

  setSuccessModal(true)
  setIsSubmitting(false)

setAeSuffix('')
  setGender('')
setAge('')
setCategory('')
setDiagnosis('')
setFallRisk('No')
setPsySpMissing([])
setHeadInjury('No')
setQ1h('No')
setCtRequired('No')
setHandover([])
setRemarks('')
}


if (staffLoading) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
      <p className="font-bold text-gray-500">
        Loading staff session...
      </p>
    </div>
  )
}

  return (
<div className="min-h-screen bg-[#f4f6f8] px-4 pt-4 pb-32 md:px-8 md:pt-6 md:pb-36">

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

<div className="flex flex-col gap-3 md:items-end">
  <div className="text-left text-white md:text-right">
    <p className="text-2xl font-bold">
      Bed {bed}
    </p>

    {aeSuffix && (
      <p className="mt-1 text-sm text-white/80 md:text-base">
        AE•••••{aeSuffix}
      </p>
    )}
  </div>

  <StaffHeaderInfo />
</div>

      </div>

    </div>

    <div className="p-4 md:p-6">
     <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div>
  <label className="block font-bold mb-2">
    AE Reference
  </label>

  <input
    type="text"
    value={aeSuffix}
    readOnly
    maxLength={5}
    placeholder="Scan AE barcode from previous page"
    className="w-full rounded-xl border bg-gray-100 p-3 uppercase tracking-widest text-gray-700"
  />

  <p className="mt-2 text-sm text-gray-500">
    Only the last 5 characters of the AE number are retained.
  </p>
</div>
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

 <label className="block font-bold mb-2">
    Category
  </label>

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
  <label className="block font-bold mb-2">
    Diagnosis
  </label>

  <select
    value={diagnosis}
    onChange={(e) => setDiagnosis(e.target.value)}
    className="w-full border p-3 rounded-xl bg-white"
  >
    <option value="">Select diagnosis</option>

    {diagnosisOptions.map((item) => (
      <option key={item} value={item}>
        {item}
      </option>
    ))}
  </select>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

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

            <div>
  <label className="block font-bold mb-3">
    CT
  </label>

  <div className="grid grid-cols-2 gap-3">
    {['Yes', 'No'].map((value) => (
      <button
        key={value}
        type="button"
        onClick={() => setCtRequired(value)}
className={`w-full px-4 md:px-6 py-3 md:py-4 rounded-2xl text-lg md:text-xl border-2 transition ${
  ctRequired === value
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
    {['Urine', 'Hstix', 'IVF', 'AOM','Cardiac Mon', 'Restraint', 'Tracking tag', 'Others'].map((item) => (
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
  disabled={isSubmitting}
  className={`w-full p-5 rounded-2xl font-bold text-xl text-white transition ${
    isSubmitting
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-[#0078AE] hover:bg-[#00638F]'
  }`}
>
  {isSubmitting
    ? 'Submitting...'
    : 'Submit'}
</button>

      </form>
    </div>
       {warningModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]">
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

    {successModal && (
  <div
    className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 px-4"
  >
    <div className="w-full max-w-[440px] rounded-3xl bg-white p-6 shadow-2xl md:p-8">
      <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5">
        <h2 className="text-2xl font-bold text-green-700">
          Case Submitted
        </h2>

        <p className="mt-2 text-gray-600">
          Bed {bed} has been added successfully.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push('/form-home')}
        className="w-full rounded-2xl bg-[#0078AE] px-4 py-4 text-lg font-bold text-white hover:bg-[#00638F]"
      >
        Return/ Add Another Case
      </button>
    </div>
  </div>
)}
    <BottomNav />
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