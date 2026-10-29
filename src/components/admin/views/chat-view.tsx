"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { PageHeader } from "@/components/admin/shared/page-header"
import { LoadingState, ErrorState, EmptyState } from "@/components/admin/shared/states"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { CHAT_ROOM_TYPES, CHAT_SENDER_TYPES, formatDate } from "@/lib/constants"
import {
  MessageCircle,
  Plus,
  Send,
  ArrowLeft,
  Users,
  UserCog,
  MessagesSquare,
  Loader2,
} from "lucide-react"

const ROOM_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CHAT_ROOM_TYPES.map((t) => [t.value, t.label])
)
const SENDER_LABEL: Record<string, string> = Object.fromEntries(
  CHAT_SENDER_TYPES.map((t) => [t.value, t.label])
)

export function ChatView() {
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet("/api/admin/chat")
      setRooms(res.data || [])
      // Keep selection in sync if still exists
      setSelectedRoom((prev) => {
        if (!prev) return prev
        const updated = (res.data || []).find((r: any) => r.id === prev.id)
        return updated || prev
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  return (
    <div>
      <PageHeader
        title="Chat Internal"
        description="Komunikasi wali ↔ wali kelas ↔ madrasah"
        icon={<MessageCircle className="h-5 w-5" />}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Chat Baru
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <LoadingState className="py-20" />
          ) : error ? (
            <ErrorState message={error} onRetry={loadRooms} />
          ) : rooms.length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="h-5 w-5" />}
              title="Belum ada chat room"
              description="Mulai percakapan baru dengan wali atau guru."
              action={
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Chat Baru
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-[calc(100vh-260px)] min-h-[520px]">
              {/* Left: Room List */}
              <div className="border-r bg-card/50 flex flex-col">
                <div className="p-3 border-b">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Chat Rooms ({rooms.length})
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="divide-y">
                    {rooms.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRoom(r)}
                        className={`w-full p-3 flex items-start gap-3 text-left hover:bg-muted/50 transition-colors ${
                          selectedRoom?.id === r.id ? "bg-muted" : ""
                        }`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {r.type === "GURU_WALI" ? (
                              <UserCog className="h-4 w-4" />
                            ) : (
                              <Users className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">
                              {r.wali?.name ||
                                r.guru?.name ||
                                r.title ||
                                "Tanpa Nama"}
                            </p>
                            {r.lastMessageAt && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatChatTime(r.lastMessageAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {ROOM_TYPE_LABEL[r.type] || r.type}
                          </p>
                          {r.lastMessage && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {r.lastMessage}
                            </p>
                          )}
                          {r._count?.messages > 0 && (
                            <Badge
                              variant="secondary"
                              className="mt-1 text-[10px] px-1.5 py-0"
                            >
                              {r._count.messages} pesan
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Messages */}
              <div className="flex flex-col">
                {selectedRoom ? (
                  <ChatRoomView
                    key={selectedRoom.id}
                    room={selectedRoom}
                    onBack={() => setSelectedRoom(null)}
                    onRoomUpdated={loadRooms}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                      <MessagesSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Pilih chat room di sebelah kiri untuk mulai mengobrol
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ChatRoomForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={(newRoom) => {
          loadRooms()
          setSelectedRoom(newRoom)
        }}
      />
    </div>
  )
}

function ChatRoomView({
  room,
  onBack,
  onRoomUpdated,
}: {
  room: any
  onBack: () => void
  onRoomUpdated: () => void
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet(`/api/admin/chat/${room.id}/messages`)
      setMessages(res.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [room.id])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg) return
    setSending(true)
    try {
      const res = await apiPost(`/api/admin/chat/${room.id}/messages`, {
        message: msg,
      })
      setMessages((prev) => [...prev, res.data])
      setInput("")
      onRoomUpdated()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Header */}
      <div className="border-b p-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden shrink-0"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {room.type === "GURU_WALI" ? (
              <UserCog className="h-4 w-4" />
            ) : (
              <Users className="h-4 w-4" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {room.wali?.name || room.guru?.name || room.title || "Tanpa Nama"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {ROOM_TYPE_LABEL[room.type] || room.type}
            {room.santri && (
              <span> • Santri: {room.santri.name}</span>
            )}
            {room.guru && room.wali && (
              <span> • Guru: {room.guru.name}</span>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30"
      >
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={loadMessages} />
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessagesSquare className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Belum ada pesan. Mulai percakapan!
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isAdmin = m.senderType === "ADMIN"
            return (
              <div
                key={m.id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] ${isAdmin ? "order-2" : ""}`}>
                  {!isAdmin && (
                    <p className="text-[10px] text-muted-foreground mb-0.5 px-1">
                      {SENDER_LABEL[m.senderType] || m.senderType}
                    </p>
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      isAdmin
                        ? "bg-primary text-primary-foreground"
                        : m.senderType === "GURU"
                          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100"
                          : "bg-card border"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {m.message}
                    </p>
                  </div>
                  <p
                    className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${
                      isAdmin ? "text-right" : ""
                    }`}
                  >
                    {formatDate(m.createdAt, true)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik pesan, tekan Enter untuk kirim..."
          disabled={sending}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          size="icon"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </>
  )
}

function ChatRoomForm({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: (room: any) => void
}) {
  const [form, setForm] = useState<any>({
    type: "WALI_MADRASAH",
    waliId: null,
    guruId: null,
    santriId: null,
  })
  const [saving, setSaving] = useState(false)
  const [waliList, setWaliList] = useState<any[]>([])
  const [guruList, setGuruList] = useState<any[]>([])
  const [santriList, setSantriList] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setForm({
        type: "WALI_MADRASAH",
        waliId: null,
        guruId: null,
        santriId: null,
      })
      // Load options in parallel — graceful fallback if any fail
      Promise.all([
        apiGet("/api/admin/wali").catch(() => ({ data: [] })),
        apiGet("/api/admin/guru").catch(() => ({ data: [] })),
        apiGet("/api/admin/santri").catch(() => ({ data: [] })),
      ]).then(([w, g, s]) => {
        setWaliList(w.data || [])
        setGuruList(g.data || [])
        setSantriList(s.data || [])
      })
    }
  }, [open])

  const handleSave = async () => {
    if (!form.type) {
      toast({
        title: "Validasi gagal",
        description: "Tipe chat wajib dipilih",
        variant: "destructive",
      })
      return
    }
    if (!form.waliId) {
      toast({
        title: "Validasi gagal",
        description: "Wali wajib dipilih",
        variant: "destructive",
      })
      return
    }
    if (form.type === "GURU_WALI" && !form.guruId) {
      toast({
        title: "Validasi gagal",
        description: "Guru wajib dipilih untuk tipe Guru ↔ Wali",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const payload: any = { type: form.type, waliId: form.waliId }
      if (form.guruId) payload.guruId = form.guruId
      if (form.santriId) payload.santriId = form.santriId
      const res = await apiPost("/api/admin/chat", payload)
      toast({
        title: "Berhasil",
        description:
          res.message || "Chat room dibuat",
      })
      onOpenChange(false)
      onSuccess(res.data)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // WALI_WALI_KELAS & GURU_WALI involve a guru
  const requiresGuru =
    form.type === "GURU_WALI" || form.type === "WALI_WALI_KELAS"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Chat Baru
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Tipe Chat *</Label>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm({ ...form, type: v, guruId: null })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAT_ROOM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Wali *</Label>
            <Select
              value={form.waliId || "none"}
              onValueChange={(v) =>
                setForm({ ...form, waliId: v === "none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Wali" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Pilih Wali —</SelectItem>
                {waliList.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                    {w.phone ? ` (${w.phone})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresGuru && (
            <div className="space-y-1">
              <Label className="text-xs">
                Guru {form.type === "GURU_WALI" ? "*" : "(opsional)"}
              </Label>
              <Select
                value={form.guruId || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, guruId: v === "none" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Guru" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tidak ada —</SelectItem>
                  {guruList.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Santri (opsional, untuk konteks)</Label>
            <Select
              value={form.santriId || "none"}
              onValueChange={(v) =>
                setForm({ ...form, santriId: v === "none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Santri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {santriList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.nis ? ` (${s.nis})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Membuat...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" /> Buat Chat Room
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Format lastMessageAt untuk tampilan list room:
 * - Hari ini: HH:mm
 * - Selain itu: dd MMM
 */
function formatChatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const isSameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (isSameDay) {
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d)
  }
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(d)
}
