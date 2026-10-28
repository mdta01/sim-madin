"use client"

import { useState, useRef } from "react"
import { apiPost } from "@/lib/api-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, X, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface PhotoUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  name?: string
  prefix?: string
  className?: string
}

export function PhotoUpload({ value, onChange, name, prefix = "photo", className }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    if (!file.type.startsWith("image/")) {
      toast({ title: "File tidak valid", description: "Hanya gambar yang diperbolehkan", variant: "destructive" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimum 5 MB", variant: "destructive" })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("prefix", prefix)
      const res = await apiPost<{ url: string }>("/api/admin/upload", formData)
      onChange(res.url)
      toast({ title: "Foto terunggah", description: "Foto profil berhasil diupload" })
    } catch (err: any) {
      toast({ title: "Upload gagal", description: err.message, variant: "destructive" })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const handleRemove = () => {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        <Avatar className="h-16 w-16 border-2 border-muted">
          {value ? (
            <img src={value} alt="Foto" className="h-full w-full object-cover" />
          ) : (
            <AvatarFallback className="bg-muted">
              {name ? name[0] : <User className="h-6 w-6 text-muted-foreground" />}
            </AvatarFallback>
          )}
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-3.5 w-3.5 mr-1" /> Upload
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
              <X className="h-3.5 w-3.5 mr-1" /> Hapus
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">JPG/PNG/WebP, maks 5 MB</p>
      </div>
    </div>
  )
}
