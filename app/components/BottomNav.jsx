'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardPlus,
  LayoutDashboard,
  ClipboardList,
  Brain,
  History
} from 'lucide-react'

const navItems = [
  {
    label: 'FORM',
    href: '/form-home',
    icon: ClipboardPlus
  },
  {
    label: 'DASHBOARD',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    label: 'HANDOVER',
    href: '/handover',
    icon: ClipboardList
  },
  {
    label: 'PSY',
    href: '/psy',
    icon: Brain
  },
  {
    label: 'HISTORY',
    href: '/history',
    icon: History
  }
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 z-[100] w-full border-t border-gray-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.10)] backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-5 gap-1 sm:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon

          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[58px] flex-col items-center justify-center rounded-2xl px-1 py-2 text-center transition sm:min-h-[68px] ${
                isActive
                  ? 'bg-[#0078AE] text-white shadow-md'
                  : 'bg-white text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Icon
                size={20}
                strokeWidth={2.2}
                className="mb-1 sm:h-6 sm:w-6"
              />

              <span className="text-[9px] font-bold leading-none sm:text-xs">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}