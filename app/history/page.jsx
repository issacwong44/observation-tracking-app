'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

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
    <div className="min-h-screen bg-[#f4f6f8] pb-40">
      <div className="bg-[#0078AE] px-8 py-6 text-white">
        <h1 className="text-3xl font-bold">History</h1>
        <p className="text-white/80">Discharged observation cases</p>
      </div>

      <div className="p-8">
        <Link href="/dashboard" className="font-bold text-[#006B8F]">
          ← Back to Dashboard
        </Link>
        
        <div className="relative flex items-center mb-6"></div>
        <input
    type="text"
    placeholder="Search Bed / Handover / Remarks"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="border border-gray-300 rounded-2xl px-4 py-3 w-[320px] shadow-sm outline-none focus:ring-2 focus:ring-[#0078AE]"
  />

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
                <th className="p-4 border-b">Ack. Tiime</th>
<th className="p-4 border-b">VS Time</th>
<th className="p-4 border-b">Discharge</th>
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
      <div className="fixed bottom-4 left-0 w-full px-4 z-50">

  <div className="grid grid-cols-2 gap-3">

   <Link
  href="/dashboard"
  className="py-4 text-center font-bold rounded-3xl shadow-xl bg-white text-gray-500 border"
>
  HOME
</Link>

<Link
  href="/history"
  className="py-4 text-center font-bold rounded-3xl shadow-xl bg-[#0078AE] hover:bg-[#00638F] text-white"
>
  HISTORY
</Link>

  </div>

</div>
    </div>
  )
}