import { useEffect, useRef, useState } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

export default function App() {
  const [version, setVersion] = useState<string>('...')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm here to help you file your 2025 Form 1040. Paste your W-2 or load the sample to get started. (Chat wiring lands in the next slice.)",
    },
  ])
  const [input, setInput] = useState('')
  const listEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setVersion(d.version ?? 'unknown'))
      .catch(() => setVersion('offline'))
  }, [])

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send() {
    const text = input.trim()
    if (!text) return
    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
  }

  return (
    <div className="flex h-full flex-col mx-auto max-w-2xl">
      <header className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">2025 Form 1040 assistant</h1>
        <p className="text-xs text-gray-500">build {version}</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={
                'inline-block rounded-lg px-3 py-2 text-sm ' +
                (m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900')
              }
            >
              {m.content}
            </span>
          </div>
        ))}
        <div ref={listEnd} />
      </main>

      <footer className="border-t p-3 flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message"
        />
        <button
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
          onClick={send}
        >
          Send
        </button>
      </footer>
    </div>
  )
}
