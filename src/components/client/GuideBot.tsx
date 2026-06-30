'use client'
import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { GuideSession, ChatMessage } from '@/types'
import { Send, Mic, Square } from 'lucide-react'

interface Props {
  lastSession: GuideSession | null
  businessId: string
}

export function GuideBot({ lastSession, businessId }: Props) {
  const searchParams = useSearchParams()
  const isNew = searchParams.get('new') === '1'
  const [messages, setMessages] = useState<ChatMessage[]>(lastSession?.messages ?? [])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(lastSession?.id ?? null)
  const [recording, setRecording] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // Opening message when no history
  useEffect(() => {
    if (messages.length === 0) {
      if (isNew) {
        sendMessage("__new_process__")
      } else {
        sendMessage("__session_start__")
      }
    }
  }, [])

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return
    setSending(true)
    setStreaming(true)

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/ai/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullText += chunk
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: fullText } : m))
      }
    } catch {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: 'Something went wrong. Try again.' } : m))
    }

    setSending(false)
    setStreaming(false)
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = e => chunksRef.current.push(e.data)
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const fd = new FormData()
      fd.append('audio', blob, 'voice.webm')
      fd.append('business_id', businessId)
      const res = await fetch('/api/ai/sop', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.text) sendMessage(`Here is the process I want documented: ${data.text}`)
    }
    recorder.start()
    mediaRef.current = recorder
    setRecording(true)
  }

  function stopRecording() {
    mediaRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#0D1B3E]">Guide Bot</h1>
        <p className="text-sm text-[#666] mt-0.5">Building structure for your business</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.filter(m => m.content !== '__session_start__' && m.content !== '__new_process__').map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#0D1B3E] text-white rounded-br-sm'
                  : 'bg-white border border-[#0D1B3E]/8 text-[#1A1A2E] rounded-bl-sm'
              }`}
            >
              {m.content || (streaming && i === messages.length - 1 ? (
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#C9952B] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#C9952B] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#C9952B] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border border-[#0D1B3E]/8 rounded-2xl p-3 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none text-sm text-[#1A1A2E] placeholder:text-[#999] focus:outline-none max-h-32 min-h-[40px]"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          rows={1}
        />
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-2 rounded-xl transition-colors ${recording ? 'bg-red-500 text-white' : 'text-[#999] hover:text-[#0D1B3E] hover:bg-[#0D1B3E]/5'}`}
            title="Hold to record voice note for SOP"
          >
            {recording ? <Square size={16} /> : <Mic size={16} />}
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending}
            className="p-2 rounded-xl bg-[#0D1B3E] text-white disabled:opacity-40 hover:bg-[#0D1B3E]/90 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
