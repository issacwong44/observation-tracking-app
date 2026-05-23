'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {

  useEffect(() => {
    testConnection()
  }, [])

  async function testConnection() {
    const { data, error } = await supabase
      .from('observation_cases')
      .select('*')

    console.log(data)
    console.log(error)
  }

  return (
    <div className="p-10 text-2xl">
      Observation Dashboard Connected
    </div>
  )
}