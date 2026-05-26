# CukupGak

Aplikasi survival budgeting Indonesia (local-first, offline non-AI).

## Run
```bash
pnpm install
pnpm expo start
```

## Env
Set di `.env`:
- `EXPO_PUBLIC_AI_BASE_URL`
- `EXPO_PUBLIC_AI_KEY`
- `EXPO_PUBLIC_AI_MODEL`

## Privacy
Semua data finansial disimpan lokal perangkat (AsyncStorage). Tidak ada backend. Request keluar hanya untuk AI Advisor bila dikonfigurasi user.

## Limitations
- Belum enkripsi lokal.
- Export/import opsional belum aktif default.
- Reports masih MVP.

## Roadmap
- Encrypt local data
- CSV export/import
- Better charts
- Reminder notifikasi jatuh tempo

## Acceptance Checklist
- TS strict zero error
- Local-first multi-bulan `monthRef`
- Offline jalan semua fitur non-AI
- Parser currency `15000/15.000/Rp15.000`
- Remaining days minimal 1
- Status rule AMAN/MEPET/BAHAYA + override tagihan dekat

---

## Next Agent Handoff
- Pakai `services/budgetCalculator.ts` sebagai source tunggal logika saldo/status. Jangan pindah ke screen.
- Lengkapi layar CRUD penuh (edit/delete/mark paid/partial) pakai pola store sama.
- Tambah `monthlyCycle.ts` untuk copy config bulan lalu saat monthRef baru.
- Jangan ubah parser currency/date tanpa update test QA numerik.
- Jaga semua teks UI Bahasa Indonesia. Kode/komentar teknis Inggris.