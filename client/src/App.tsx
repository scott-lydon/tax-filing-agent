import { useEffect, useRef, useState } from 'react'
import { TracePanel, type TraceEvent } from './TracePanel'

type Message = { role: 'user' | 'assistant'; content: string }

export default function App() {
  const [version, setVersion] = useState('...')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloadReady, setDownloadReady] = useState(false)
  const [trace, setTrace] = useState<TraceEvent[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const listEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setVersion(d.version ?? 'unknown'))
      .catch(() => setVersion('offline'))

    fetch('/api/session', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        setSessionId(d.id)
        setMessages([{ role: 'assistant', content: d.greeting }])
      })
  }, [])

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function refreshTrace(id: string) {
    const d = await fetch(`/api/session/${id}/trace`).then((r) => r.json())
    if (d.ok) setTrace(d.events)
  }

  async function sendText(text: string) {
    if (!sessionId || !text.trim() || loading) return
    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`/api/session/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      }).then((r) => r.json())
      if (res.ok) {
        setMessages((m) => [...m, { role: 'assistant', content: res.assistant }])
        if (res.downloadReady) setDownloadReady(true)
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: `Sorry, something went wrong: ${res.detail ?? res.error}` },
        ])
      }
      await refreshTrace(sessionId)
    } finally {
      setLoading(false)
    }
  }

  async function loadSample() {
    const w2 = await fetch('/api/sample-w2').then((r) => r.text())
    await sendText(`Here is my W-2 to get started:\n${w2}`)
  }

  return (
    <div className="flex h-full flex-col mx-auto max-w-2xl">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">2025 Form 1040 assistant</h1>
          <p className="text-xs text-gray-500">build {version} · prototype · not tax advice</p>
        </div>
        <button
          className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
          onClick={loadSample}
          disabled={!sessionId || loading}
          data-testid="use-sample"
        >
          Use sample W-2
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              data-testid={m.role === 'assistant' ? 'assistant-msg' : 'user-msg'}
              className={
                'inline-block whitespace-pre-wrap text-left rounded-lg px-3 py-2 text-sm max-w-[90%] ' +
                (m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900')
              }
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <div className="text-left text-sm text-gray-400">Tilly is thinking…</div>}
        {downloadReady && sessionId && (
          <div className="text-left">
            <a
              className="inline-block rounded bg-green-600 px-4 py-2 text-sm font-medium text-white"
              href={`/api/return/${sessionId}/download`}
              data-testid="download"
            >
              Download your filled 1040 (PDF)
            </a>
          </div>
        )}
        <div ref={listEnd} />
      </main>

      <TracePanel events={trace} open={drawerOpen} onToggle={() => setDrawerOpen((o) => !o)} />

      <footer className="border-t p-3 flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendText(input)}
          placeholder={sessionId ? 'Type a message' : 'Connecting…'}
          disabled={!sessionId || loading}
          data-testid="chat-input"
        />
        <button
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40"
          onClick={() => sendText(input)}
          disabled={!sessionId || loading}
          data-testid="send"
        >
          Send
        </button>
      </footer>
    </div>
  )
}
