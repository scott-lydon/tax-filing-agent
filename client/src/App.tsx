import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { TracePanel, type TraceEvent } from './TracePanel'

type Message = { role: 'user' | 'assistant'; content: string }

/** A readable, human-friendly W-2 summary the agent can still parse, instead of raw JSON in the chat. */
function sampleW2Summary(w2: Record<string, unknown>): string {
  const usd = (n: unknown) =>
    typeof n === 'number'
      ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      : 'n/a'
  const lines = [
    "Here's my W-2 to get started:",
    '',
    `- Employee: ${w2.employeeName} (SSN ${w2.employeeSSN})`,
    `- Employer: ${w2.employerName} (EIN ${w2.employerEIN})`,
    `- Box 1, wages: ${usd(w2.box1Wages)}`,
    `- Box 2, federal income tax withheld: ${usd(w2.box2FedWithholding)}`,
  ]
  if (w2.box3SsWages != null) lines.push(`- Box 3, Social Security wages: ${usd(w2.box3SsWages)}`)
  if (w2.box4SsTax != null) lines.push(`- Box 4, Social Security tax: ${usd(w2.box4SsTax)}`)
  if (w2.box5MedicareWages != null) lines.push(`- Box 5, Medicare wages: ${usd(w2.box5MedicareWages)}`)
  if (w2.box6MedicareTax != null) lines.push(`- Box 6, Medicare tax: ${usd(w2.box6MedicareTax)}`)
  if (w2.box16StateWages != null) lines.push(`- Box 16, state wages: ${usd(w2.box16StateWages)}`)
  if (w2.box17StateTax != null) lines.push(`- Box 17, state income tax: ${usd(w2.box17StateTax)}`)
  return lines.join('\n')
}

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloadReady, setDownloadReady] = useState(false)
  const [trace, setTrace] = useState<TraceEvent[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const listEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
    const w2 = await fetch('/api/sample-w2').then((r) => r.json())
    await sendText(sampleW2Summary(w2))
  }

  return (
    <div className="flex h-full flex-col mx-auto max-w-2xl">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">2025 Form 1040 assistant</h1>
          <p className="text-xs text-gray-500">not tax advice</p>
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
            {m.role === 'assistant' ? (
              <div
                data-testid="assistant-msg"
                className="inline-block text-left rounded-lg px-3 py-2 text-sm max-w-[90%] bg-gray-100 text-gray-900 [&_p]:my-0 [&_p+p]:mt-2 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_code]:rounded [&_code]:bg-gray-200 [&_code]:px-1"
              >
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ) : (
              <span
                data-testid="user-msg"
                className="inline-block whitespace-pre-wrap text-left rounded-lg px-3 py-2 text-sm max-w-[90%] bg-blue-600 text-white"
              >
                {m.content}
              </span>
            )}
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
