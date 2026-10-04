import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Trash2, PhoneCall, Phone, MessageCircle, Mail, MapPin, Instagram, Facebook, Music2, Twitter, Ghost, Send, Globe, Link2, Pencil, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/dashboard/page-shell";
import {
  deleteContactInfo, listContactInfo, upsertContactInfo, type ContactInfoDTO,
} from "@/lib/content.functions";
import { setPublished } from "@/lib/publish.functions";

export const Route = createFileRoute("/contacts")({
  head: () => ({ meta: [{ title: "معلومات التواصل · cupai" }] }),
  component: ContactsPage,
});

const KINDS = ["phone", "whatsapp", "email", "address", "instagram", "facebook", "tiktok", "twitter", "snapchat", "telegram", "website", "other"];
const KIND_LABEL: Record<string, string> = {
  phone: "هاتف", whatsapp: "واتساب", email: "بريد", address: "عنوان",
  instagram: "إنستغرام", facebook: "فيسبوك", tiktok: "تيك توك", twitter: "تويتر",
  snapchat: "سناب شات", telegram: "تيليغرام", website: "موقع", other: "أخرى",
};

const KIND_ICON: Record<string, LucideIcon> = {
  phone: Phone, whatsapp: MessageCircle, email: Mail, address: MapPin, instagram: Instagram,
  facebook: Facebook, tiktok: Music2, twitter: Twitter, snapchat: Ghost, telegram: Send, website: Globe, other: Link2,
};

function ContactsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["contacts"], queryFn: () => listContactInfo() });
  const [draft, setDraft] = useState<Partial<ContactInfoDTO>>({ kind: "phone" });
  const [editing, setEditing] = useState<Record<string, Partial<ContactInfoDTO>>>({});

  const saveMut = useMutation({
    mutationFn: (p: Partial<ContactInfoDTO>) =>
      upsertContactInfo({ data: { id: p.id, kind: p.kind ?? "other", label: p.label ?? null, value: p.value ?? "" } }),
    onSuccess: (_r, vars) => {
      toast.success("تم الحفظ.");
      if (!vars.id) setDraft({ kind: "phone" });
      else setEditing((prev) => { const n = { ...prev }; delete n[vars.id!]; return n; });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "فشل الحفظ."),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteContactInfo({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
  const pubMut = useMutation({
    mutationFn: (v: { id: string; is_published: boolean }) =>
      setPublished({ data: { table: "contact_info", id: v.id, is_published: v.is_published } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "فشل النشر."),
  });

  return (
    <PageShell
      title="معلومات التواصل"
      description="أرقام الهاتف، العناوين، ووسائل التواصل الاجتماعي."
      icon={<PhoneCall className="h-5 w-5" />}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-card backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4 text-primary" />
            إضافة جهة تواصل جديدة
          </h2>
          <div className="grid gap-3 sm:grid-cols-[160px_160px_1fr]">
            <div>
              <Label className="text-xs">النوع</Label>
              <select value={draft.kind ?? "phone"} onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k] ?? k}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">تسمية</Label>
              <Input className="mt-1" value={draft.label ?? ""} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} placeholder="اختياري" />
            </div>
            <div>
              <Label className="text-xs">القيمة</Label>
              <Input className="mt-1" value={draft.value ?? ""} onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => saveMut.mutate(draft)}
              disabled={saveMut.isPending || !draft.value}
              className="w-full bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-95 sm:w-auto"
            >
              <Save className="ml-1 h-4 w-4" />حفظ
            </Button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {q.isLoading ? <p className="text-sm text-muted-foreground">جاري التحميل...</p> :
            (q.data ?? []).length === 0 ? (
              <p className="sm:col-span-2 rounded-2xl border border-dashed border-border/60 bg-background/60 p-10 text-center text-sm text-muted-foreground">
                لا توجد بيانات تواصل بعد — أضف أول جهة من الأعلى.
              </p>
            ) : (q.data ?? []).map((c) => {
              const e = editing[c.id];
              const isEditing = !!e;
              const v = { ...c, ...(e ?? {}) };
              return (
                <div key={c.id} className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-card backdrop-blur-sm transition hover:border-primary/40">
                  {isEditing ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select value={v.kind} onChange={(ev) => setEditing((p) => ({ ...p, [c.id]: { ...p[c.id], kind: ev.target.value } }))}
                        className="rounded-md border border-input bg-background px-2 py-2 text-sm">
                        {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k] ?? k}</option>)}
                      </select>
                      <Input value={v.label ?? ""} onChange={(ev) => setEditing((p) => ({ ...p, [c.id]: { ...p[c.id], label: ev.target.value } }))} />
                      <Input value={v.value} onChange={(ev) => setEditing((p) => ({ ...p, [c.id]: { ...p[c.id], value: ev.target.value } }))} />
                      <div className="flex gap-2 sm:col-span-2">
                        <Button size="sm" className="flex-1" onClick={() => saveMut.mutate({ ...v, id: c.id })}>حفظ</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing((p) => { const n = { ...p }; delete n[c.id]; return n; })}>إلغاء</Button>
                      </div>
                    </div>
                  ) : (
                    (() => { const Icon = KIND_ICON[c.kind] ?? Link2; return (
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{KIND_LABEL[c.kind] ?? c.kind}{c.label ? ` · ${c.label}` : ""}</p>
                        <p dir="auto" className="truncate text-sm font-semibold text-foreground">{c.value}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="outline" aria-label="تعديل" onClick={() => setEditing((p) => ({ ...p, [c.id]: { ...c } }))}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="حذف" className="text-destructive hover:text-destructive" onClick={() => { if (confirm("حذف؟")) delMut.mutate(c.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    ); })()
                  )}
                </div>
              );
            })}
        </section>
      </div>
    </PageShell>
  );
}
