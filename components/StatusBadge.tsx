type Status = 'connected' | 'connecting' | 'disconnected' | 'error'

const cfg: Record<Status, { dot: string; bg: string; label: string }> = {
  connected:    { dot: 'bg-green-500',             bg: 'bg-green-50 text-green-700',   label: '연결됨' },
  connecting:   { dot: 'bg-yellow-400 animate-pulse', bg: 'bg-yellow-50 text-yellow-700', label: '연결 중...' },
  disconnected: { dot: 'bg-gray-400',              bg: 'bg-gray-100 text-gray-500',    label: '연결 안됨' },
  error:        { dot: 'bg-red-500',               bg: 'bg-red-50 text-red-700',       label: '오류' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const { dot, bg, label } = cfg[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${bg}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
