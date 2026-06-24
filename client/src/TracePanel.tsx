export type TraceEvent = { ts: number; type: string; data: unknown }

function summarize(e: TraceEvent): { icon: string; label: string; detail: string; danger?: boolean } {
  const d = (e.data ?? {}) as Record<string, unknown>
  switch (e.type) {
    case 'tool_call':
      return { icon: '🔧', label: `tool call: ${d.name}`, detail: JSON.stringify(d.args) }
    case 'tool_result':
      return {
        icon: d.ok ? '✓' : '✗',
        label: `result: ${d.name}`,
        detail: typeof d.summary === 'string' ? d.summary : JSON.stringify(d.summary),
        danger: d.ok === false,
      }
    case 'question_counted':
      return { icon: '❓', label: `question ${d.questionsAsked}/5`, detail: String(d.questionId) }
    case 'guardrail_block':
      return { icon: '🛑', label: `guardrail block: ${d.ruleId}`, detail: String(d.redirect ?? ''), danger: true }
    case 'finalize':
      return { icon: '📄', label: 'finalized 1040', detail: String(d.download_url ?? '') }
    case 'user_message':
      return { icon: '🧑', label: 'user message', detail: String(d.text ?? '').slice(0, 120) }
    case 'assistant_message':
      return { icon: '💬', label: 'assistant message', detail: String(d.text ?? '').slice(0, 120) }
    case 'session_start':
      return { icon: '▶', label: 'session start', detail: '' }
    default:
      return { icon: '•', label: e.type, detail: JSON.stringify(d).slice(0, 120) }
  }
}

export function TracePanel({
  events,
  open,
  onToggle,
}: {
  events: TraceEvent[]
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-t">
      <button
        className="w-full text-left px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 flex justify-between"
        onClick={onToggle}
        data-testid="trace-toggle"
      >
        <span>Show what the agent did ({events.length} events)</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="max-h-[min(50vh,calc(100vh-3rem))] overflow-y-auto overscroll-contain px-4 pb-3 space-y-1 bg-gray-50">
          {events.length === 0 && <p className="text-xs text-gray-400 py-2">No activity yet.</p>}
          {events.map((e, i) => {
            const s = summarize(e)
            return (
              <div
                key={i}
                className={
                  'text-xs font-mono rounded px-2 py-1 ' +
                  (s.danger ? 'bg-red-100 text-red-800' : 'bg-white text-gray-700')
                }
              >
                <span className="mr-1">{s.icon}</span>
                <span className="font-semibold">{s.label}</span>
                {s.detail && <span className="text-gray-500"> — {s.detail}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
