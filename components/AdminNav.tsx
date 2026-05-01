'use client'
import { Activity, Users, FileText, Database, Settings, AlertCircle } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: '대시보드', icon: Activity },
  { id: 'users',     label: '사용자',   icon: Users },
  { id: 'glossary',  label: '용어집',   icon: FileText },
  { id: 'records',   label: '기록',     icon: Database },
  { id: 'settings',  label: '설정',     icon: Settings },
  { id: 'logs',      label: '에러 로그', icon: AlertCircle },
] as const

export type AdminTab = typeof TABS[number]['id']

interface Props {
  active: AdminTab
  onChange: (tab: AdminTab) => void
}

export default function AdminNav({ active, onChange }: Props) {
  return (
    <nav className="flex gap-2 flex-wrap">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            active === id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </nav>
  )
}
