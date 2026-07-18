'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import BottomNav from '../components/BottomNav'
import StaffHeaderInfo from '../components/StaffHeaderInfo'

export default function HistoryPage() {
  const [cases, setCases] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  const historyCases = cases.filter(
  (item) => item.confirmed_dc_at
)
const filteredHistoryCases = historyCases.filter((item) => {

  const search = searchTerm.toLowerCase()

  return (
    item.bed_no?.toString().includes(search) ||
    item.nursing_handover?.toLowerCase().includes(search) ||
    item.remarks?.toLowerCase().includes(search)
  )
})

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    const { data, error } = await supabase
      .from('observation_cases')
      .select('*')
      .not('confirmed_dc_at', 'is', null)
      .order('confirmed_dc_at', { ascending: false })

    if (!error) setCases(data)
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-32 md:pb-36">
<div className="bg-[#0078AE] px-5 py-4 text-white md:px-8 md:py-5">
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="text-xl font-bold md:text-3xl">
        History
      </h1>

      <p className="mt-1 text-sm text-white/80 md:text-base">
        Discharged observation cases
      </p>
    </div>

    <StaffHeaderInfo />
  </div>
</div>

      <div className="p-8">
        <Link href="/dashboard" className="font-bold text-[#006B8F]">
          ← Back to Dashboard
        </Link>
        
        <div className="mt-6 mb-10">
  <input
    type="text"
    placeholder="Search Bed / Handover / Remarks"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full md:w-[320px] border border-gray-300 rounded-2xl px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-[#0078AE]"
  />
</div>

<div className="bg-white rounded-3xl p-6 shadow">
        <div className="rounded-3xl overflow-x-auto border border-gray-200">
 <table className="min-w-[1000px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#0078AE] text-white">
                <th className="p-4 border-b">Bed</th>
                <th className="p-4 border-b">Gender</th>
                <th className="p-4 border-b">Age</th>
                <th className="p-4 border-b">Category</th>
                <th className="p-4 border-b">Handover</th>
                <th className="p-4 border-b">Remarks</th>
                <th className="p-4 border-b">Ack. Time</th>
<th className="p-4 border-b">VS Time</th>
<th className="p-4 border-b">Discharge Time</th>
              </tr>
            </thead>

            <tbody>
              {filteredHistoryCases.map((item) => (
                <tr key={item.id}>
                  <td className="p-4 border font-bold">{item.bed_no}</td>
                  <td className="p-4 border">{item.gender}</td>
                  <td className="p-4 border">{item.age}</td>
                  <td className="p-4 border">Cat {item.category}</td>
                  <td className="p-4 border">{item.nursing_handover || '-'}</td>
                  <td className="p-4 border">{item.remarks || '-'}</td>
                  <td className="p-4 border">
  {item.acknowledged_at
    ? new Date(item.acknowledged_at).toLocaleString('en-GB')
    : '-'}
</td>

<td className="p-4 border">
  {item.vs_taken_at
    ? new Date(item.vs_taken_at).toLocaleString('en-GB')
    : '-'}
</td>
                  <td className="p-4 border">
                    {item.confirmed_dc_at
                      ? new Date(item.confirmed_dc_at).toLocaleString('en-GB')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
     <BottomNav />
    </div>
  )
}