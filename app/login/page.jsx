'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect =
    searchParams.get('redirect') || '/form'


 const [password, setPassword] = useState('')
  const MASTER_PASSWORD = '7230'
  const [error, setError] = useState('')

const handleLogin = () => {
  if (password !== MASTER_PASSWORD) {
    setError('Incorrect password. Please try again.')
    return
  }
  setError('')

  localStorage.setItem('staff', 'logged_in')

  router.push(redirect || '/')
}


  return (
    <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-[400px]">


        <p className="text-gray-500 mb-8">
          Observation Room Access
        </p>


        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-2xl px-4 py-3 mb-6 outline-none focus:ring-2 focus:ring-[#0078AE]"
        />

{error && (
  <p className="text-red-500 font-semibold mb-4">
    {error}
  </p>
)}

        <button
          onClick={handleLogin}
          className="w-full bg-[#0078AE] hover:bg-[#00638F] text-white py-3 rounded-2xl font-bold"
        >
          Login
        </button>

      </div>
    </div>
  )
}
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}