'use client'

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}

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