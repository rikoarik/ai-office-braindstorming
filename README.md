<p align="center">
  <strong>🏢 AI Office — Multi-Agent AI Development Factory</strong>
</p>

<p align="center">
  Simulasi kantor AI multi-agen yang menjalankan pipeline proyek secara otomatis — dari perencanaan hingga deployment — dengan real-time streaming, custom office templates, dan konversi dokumen Office.
</p>

---

## 📋 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Fitur Utama](#-fitur-utama)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Tech Stack](#-tech-stack)
- [Struktur Direktori](#-struktur-direktori)
- [Memulai (Getting Started)](#-memulai-getting-started)
- [API Reference](#-api-reference)
- [Office Templates](#-office-templates)
- [State Machine & Pipeline](#-state-machine--pipeline)
- [Agent Prompts](#-agent-prompts)
- [Fitur Internet Tools](#-fitur-internet-tools)
- [Office Converter](#-office-converter)
- [Kontribusi](#-kontribusi)
- [Lisensi](#-lisensi)

---

## 🧠 Tentang Proyek

**AI Office** adalah platform multi-agen yang mensimulasikan kantor pengembangan perangkat lunak (atau jenis kantor lainnya). Setiap proyek melewati pipeline produksi yang terdiri dari beberapa tahap (stages), di mana masing-masing tahap dikerjakan oleh agen AI khusus dengan persona dan tugas berbeda.

Bayangkan sebuah kantor virtual di mana:
- **Product Manager** menyusun blueprint proyek
- **UX Designer** membuat spesifikasi desain
- **Frontend & Backend Engineer** menulis kode secara paralel
- **QA Engineer** melakukan review dan testing
- **VP Engineering** menyusun deployment plan

Semua proses ini dijalankan secara **otomatis** oleh AI, dengan kontrol manusia di titik-titik keputusan kritis (PM Review).

---

## ✨ Fitur Utama

### 🤖 Multi-Agent Pipeline
- **6 agen AI spesialis** (PM, UX, Frontend, Backend, QA, DevOps) bekerja secara berurutan
- Frontend & Backend berjalan **paralel** pada tahap Development
- QA otomatis mengembalikan ke tahap Dev jika `VERDICT: FAIL`
- Sistem **Pause/Resume** untuk menghentikan dan melanjutkan pipeline kapan saja

### 🎭 Onboarding Chat (Pre-Production Lobby)
- Sesi brainstorming interaktif dengan komite AI sebelum proyek dimulai
- Karakter AI (Alice, Bob, Eve, Charlie, Dave, Sam, Ivy) berdiskusi dalam Bahasa Indonesia
- Ekstraksi requirements otomatis dalam format JSON terstruktur
- Dukungan **import proyek lokal** dari filesystem

### 📡 Real-Time Streaming (SSE)
- Server-Sent Events untuk update progress pipeline secara real-time
- Streaming token-by-token dari respons AI
- Update Kanban board, chat log, dan workspace file secara live
- Heartbeat setiap 25 detik untuk menjaga koneksi tetap hidup

### 🏗️ Office Templates
- **6 template kantor bawaan**: Software Dev, Marketing Agency, Design Studio, Content Factory, Video Production, Skripsi & Presentasi
- Setiap template memiliki stages, roles, dan prompts berbeda
- Buat **Custom Templates** sendiri melalui UI
- Setiap stage bisa dikonfigurasi: role, prompt, output files

### 📄 Office Document Converter
- **Markdown → DOCX**: Konversi otomatis ke Word Document dengan styling profesional
- **Markdown → PPTX**: Konversi otomatis ke PowerPoint dengan slide parsing cerdas
- **Markdown Table → XLSX**: Konversi tabel markdown ke Excel spreadsheet
- Semua output file bisa diunduh langsung dari workspace

### 🌐 Internet Tools (Web Search & Scrape)
- Agen AI bisa **mencari di internet** via DuckDuckGo (`---WEBSEARCH:query---`)
- Agen AI bisa **membaca halaman web** (`---WEBSCRAPE:url---`)
- Multi-turn: AI mendapat hasil pencarian, lalu melanjutkan penulisan berdasarkan referensi
- Mendukung hingga 3 turns pencarian per sesi

### 🎨 Frontend 3D Office Scene
- Visualisasi kantor 3D menggunakan **React Three Fiber + Drei**
- Tampilan isometrik dengan model 3D interaktif
- Desain neobrutalist dengan tema premium

---

## 🏛️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (React + Vite)              │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌─────────┐  │
│  │ Onboard  │ │  Pipeline  │ │  ChatLog │ │Settings │  │
│  │  Chat    │ │  Stepper   │ │ Markdown │ │  Page   │  │
│  └──────────┘ └────────────┘ └──────────┘ └─────────┘  │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌─────────┐  │
│  │ Sidebar  │ │   Kanban   │ │ FileTree │ │ Office  │  │
│  │          │ │   Board    │ │ Viewer   │ │ Scene3D │  │
│  └──────────┘ └────────────┘ └──────────┘ └─────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP + SSE
┌──────────────────────┴──────────────────────────────────┐
│                   SERVER (Node.js + Express)            │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │   Routes         │  │      Core Modules           │  │
│  │  /api/projects   │  │  ┌────────────────────────┐  │  │
│  │  /api/pipeline   │  │  │    State Machine       │  │  │
│  │  /api/stream     │  │  │  (FSM transitions,     │  │  │
│  │  /api/settings   │  │  │   role permissions)    │  │  │
│  └──────────────────┘  │  └────────────────────────┘  │  │
│                        │  ┌────────────────────────┐  │  │
│  ┌──────────────────┐  │  │    AI Worker           │  │  │
│  │   SSE Broker     │  │  │  (OpenAI streaming,    │  │  │
│  │  (per-project    │  │  │   file parsing,        │  │  │
│  │   event stream)  │  │  │   web search/scrape)   │  │  │
│  └──────────────────┘  │  └────────────────────────┘  │  │
│                        │  ┌────────────────────────┐  │  │
│  ┌──────────────────┐  │  │  Office Converter      │  │  │
│  │   SQLite (WAL)   │  │  │  (md→docx, md→pptx,   │  │  │
│  │   better-sqlite3 │  │  │   table→xlsx)          │  │  │
│  └──────────────────┘  │  └────────────────────────┘  │  │
└─────────────────────────────────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │   OpenAI-Compatible │
            │   API (9router)     │
            └─────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
| Teknologi | Kegunaan |
|---|---|
| **Node.js + Express 5** | Web server & REST API |
| **better-sqlite3** | Database lokal (WAL mode) |
| **OpenAI SDK** | Koneksi ke LLM via proxy (9router) |
| **Server-Sent Events** | Real-time streaming ke client |
| **html-to-docx** | Konversi Markdown → Word (.docx) |
| **pptxgenjs** | Generasi PowerPoint (.pptx) |
| **xlsx (SheetJS)** | Generasi Excel (.xlsx) |
| **marked** | Parser Markdown ke HTML |
| **nanoid** | Generator ID unik untuk proyek |
| **dotenv** | Manajemen environment variables |

### Frontend
| Teknologi | Kegunaan |
|---|---|
| **React 19 + TypeScript** | UI framework |
| **Vite 8** | Build tool & dev server |
| **React Three Fiber + Drei** | Visualisasi 3D office scene |
| **Three.js** | Engine 3D rendering |
| **react-markdown + remark-gfm** | Render markdown di chat |
| **iconsax-react** | Icon library |
| **CSS Modules** | Scoped component styling |

---

## 📁 Struktur Direktori

```text
ai-office/
├── client/                          # Frontend React (Vite + TS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatLog.tsx          # Panel chat log per proyek
│   │   │   ├── ChatMessageMarkdown.tsx  # Renderer pesan markdown
│   │   │   ├── FileTree.tsx         # File explorer workspace
│   │   │   ├── KanbanBoard.tsx      # Kanban board visual
│   │   │   ├── MarkdownViewer.tsx   # Viewer file markdown
│   │   │   ├── OfficeScene.tsx      # 3D office scene (R3F)
│   │   │   ├── OnboardingChat.tsx   # Lobby brainstorming chat
│   │   │   ├── PipelineStepper.tsx  # Visual pipeline progress
│   │   │   ├── SettingsPage.tsx     # Halaman konfigurasi office
│   │   │   └── Sidebar.tsx          # Navigasi sidebar proyek
│   │   ├── hooks/
│   │   │   └── usePipelineStream.ts # Hook SSE untuk real-time update
│   │   ├── App.tsx                  # Root application component
│   │   ├── index.css                # Global styles
│   │   └── main.tsx                 # Entrypoint React
│   ├── public/                      # Asset statis (favicon, icons)
│   ├── index.html                   # HTML template
│   ├── vite.config.ts               # Konfigurasi Vite
│   ├── tsconfig.json                # TypeScript config
│   └── package.json                 # Dependencies frontend
│
├── src/                             # Backend (Node.js)
│   ├── prompts/                     # Prompt persona agen AI
│   │   ├── pm.md                    # Product Manager
│   │   ├── ux.md                    # UX Designer
│   │   ├── frontend.md              # Frontend Engineer
│   │   ├── backend.md               # Backend Engineer
│   │   ├── qa.md                    # QA Engineer
│   │   ├── final.md                 # VP Engineering / Deploy
│   │   ├── mobile.md                # Mobile Developer
│   │   ├── orchestrator.md          # Orchestrator
│   │   ├── reviewer.md              # Code Reviewer
│   │   ├── academic_proposal.md     # Peneliti Akademik
│   │   ├── academic_theory.md       # Spesialis Kajian Teori
│   │   ├── academic_intro.md        # Penulis Draf Utama
│   │   ├── academic_analysis.md     # Analis Data
│   │   ├── academic_review.md       # Dosen Pembimbing
│   │   └── academic_slides.md       # Spesialis Presentasi
│   ├── routes/
│   │   ├── projects.js              # CRUD proyek + onboarding chat
│   │   ├── pipeline.js              # Kontrol pipeline (action, stop)
│   │   ├── stream.js                # SSE endpoint per proyek
│   │   └── settings.js              # Konfigurasi office & templates
│   ├── utils/
│   │   └── officeConverter.js       # Konversi md → docx/pptx/xlsx
│   ├── aiWorker.js                  # Eksekusi agen AI (streaming)
│   ├── db.js                        # Database layer (SQLite)
│   ├── sse.js                       # SSE broker (per-project)
│   └── stateMachine.js              # Finite State Machine
│
├── data/                            # Database SQLite (auto-generated)
├── workspace/                       # Output file per proyek (auto-generated)
├── public/                          # Asset statis server
├── .env.example                     # Template konfigurasi environment
├── .gitignore                       # Git ignore rules
├── package.json                     # Dependencies backend
└── server.js                        # Entrypoint Express server
```

---

## 🚀 Memulai (Getting Started)

### Prasyarat

- **Node.js** v18+ (disarankan v20+)
- **npm** (bawaan Node.js)
- **API Key** dari 9router atau penyedia OpenAI-compatible lainnya

### 1. Clone Repository

```bash
git clone https://github.com/rikoarik/ai-office-braindstorming.git
cd ai-office-braindstorming/ai-office
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
```

Edit file `.env` sesuai kebutuhan:

```env
# URL proxy API (OpenAI-compatible)
NINER_ROUTER_URL=http://localhost:20128/v1

# API Key dari 9router dashboard
NINER_ROUTER_KEY=your_api_key_here

# Model AI yang digunakan
AI_MODEL=your_model_here
```

> **Catatan:** Konfigurasi AI juga bisa diatur melalui halaman **Settings** di UI tanpa perlu mengubah file `.env`.

### 3. Install & Jalankan Backend

```bash
npm install
node server.js
```

Backend berjalan di **http://localhost:3000**

### 4. Install & Jalankan Frontend

```bash
cd client
npm install
npm run dev
```

Frontend berjalan di **http://localhost:5173** (default Vite)

### 5. Build untuk Produksi

```bash
cd client
npm run build
```

Hasil build di `client/dist/` — bisa di-serve sebagai static files.

---

## 📡 API Reference

### Projects

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/projects` | List semua proyek |
| `POST` | `/api/projects` | Buat proyek baru + mulai pipeline |
| `GET` | `/api/projects/:id` | Detail proyek (state, chat, files) |
| `DELETE` | `/api/projects/:id` | Hapus proyek beserta workspace |
| `POST` | `/api/projects/onboard` | Streaming onboarding chat (SSE) |
| `GET` | `/api/projects/scrape?url=...` | Scrape konten halaman web |

#### Create Project — `POST /api/projects`

```json
{
  "name": "Nama Proyek",
  "task": "Deskripsi lengkap tugas proyek",
  "importPath": "/path/to/local/project",  // optional
  "onboardMessages": [...]                 // optional
}
```

### Pipeline

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/pipeline/:id/action` | Kirim event ke FSM (approve, reject, pause, resume) |
| `POST` | `/api/pipeline/:id/stop` | Stop paksa pipeline yang sedang berjalan |

#### Action — `POST /api/pipeline/:id/action`

```json
{
  "event": "approve",   // approve | reject | pass | fail | pause | resume
  "role": "pm"          // pm | qa | system
}
```

### Stream (SSE)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/stream/:id` | Subscribe SSE untuk proyek tertentu |

**Event types:**
- `pipeline_update` — perubahan state pipeline
- `chat_message` — pesan baru di chat log
- `ai_chunk` — token streaming dari AI
- `workspace_update` — file baru di workspace
- `decision_required` — membutuhkan persetujuan user (PM review)

### Settings

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/settings` | Get konfigurasi office saat ini |
| `PUT` | `/api/settings` | Update konfigurasi office |
| `GET` | `/api/settings/templates` | List semua template (preset + custom) |
| `POST` | `/api/settings/templates` | Buat custom template baru |
| `DELETE` | `/api/settings/templates/:id` | Hapus custom template |
| `PUT` | `/api/settings/template/:id` | Aktifkan template tertentu |
| `PUT` | `/api/settings/stages/:id/prompt` | Update prompt untuk satu stage |
| `GET` | `/api/settings/stages/:id/default-prompt` | Get prompt default dari file .md |
| `POST` | `/api/settings/reset` | Reset ke konfigurasi default |

---

## 🏢 Office Templates

### Template Bawaan (Built-in)

| Template | Icon | Stages | Deskripsi |
|----------|------|--------|-----------|
| **Software Dev Office** | 🖥️ | Planning → Design → Frontend → Backend → QA → Deploy | Pipeline full-stack software development |
| **Marketing Agency** | 📢 | Brief → Creative → Copywriting → Content → Review → Launch | Pipeline kampanye marketing |
| **Design Studio** | 🎨 | Research → Moodboard → Design → Assets → Revision → Delivery | Pipeline desain visual & brand |
| **Content Factory** | 📝 | Research → Outline → Draft → SEO → Edit → Publish | Pipeline pembuatan konten artikel |
| **Video Production** | 🎬 | Concept → Script → Storyboard → Production → Review → Post | Pipeline produksi video |
| **Skripsi & Presentasi** | 🎓 | Riset → Tinjauan Pustaka → Pendahuluan → Analisis → Bimbingan → Kompilasi & Slide | Pipeline penulisan skripsi akademik |

### Custom Templates

Buat template sendiri melalui API atau UI Settings:

```json
{
  "name": "Nama Template",
  "icon": "🔧",
  "description": "Deskripsi template",
  "stages": [
    {
      "id": "stage_id",
      "name": "Nama Stage",
      "role": "Nama Role",
      "chatRole": "assistant",
      "promptFile": "pm.md",
      "customPrompt": "Instruksi khusus...",
      "outputFiles": ["output1.md", "output2.docx"],
      "enabled": true
    }
  ],
  "onboard_prompt": "System prompt untuk onboarding chat..."
}
```

---

## ⚙️ State Machine & Pipeline

Pipeline menggunakan **Finite State Machine (FSM)** untuk mengatur alur transisi antar tahap.

### State Diagram (Default / Software Dev)

```
idle ──start──▶ planning_active ──ai_done──▶ planning_pm_review
                                                │
                                    approve ◀───┤───▶ reject → idle
                                        │
                                        ▼
                                  design_active ──ai_done──▶ dev_active
                                                              │
                                                    (frontend + backend paralel)
                                                              │
                                                         ──ai_done──▶ qa_active
                                                                        │
                                                            pass ◀──────┤──────▶ fail → dev_active
                                                              │
                                                              ▼
                                                        deploy_active ──ai_done──▶ done
```

### Role Permissions

| Role | Events yang Diizinkan |
|------|----------------------|
| `pm` | `approve`, `reject` |
| `qa` | `pass`, `fail` |
| `system` | `ai_done`, `start`, `stop` |
| (semua) | `pause`, `resume` |

### Custom Pipeline States

Untuk template custom, state menggunakan format `stage_{index}_active` dan `stage_{index}_pm_review`, memungkinkan jumlah stage yang dinamis.

---

## 🎭 Agent Prompts

Setiap agen AI memiliki file prompt `.md` di `src/prompts/` yang mendefinisikan persona, tugas, dan format output.

### Prompt yang Tersedia

| File | Role | Kegunaan |
|------|------|----------|
| `pm.md` | Product Manager | Menyusun PRD & blueprint arsitektur |
| `ux.md` | UX Designer | Membuat mockup & design tokens |
| `frontend.md` | Frontend Engineer | Menulis kode frontend |
| `backend.md` | Backend Engineer | Menulis kode backend & API |
| `qa.md` | QA Engineer | Review kode & test report |
| `final.md` | VP Engineering | Deployment plan & Dockerfile |
| `mobile.md` | Mobile Developer | Pengembangan aplikasi mobile |
| `reviewer.md` | Code Reviewer | Review kode mendalam |
| `orchestrator.md` | Orchestrator | Koordinasi antar agen |
| `academic_*.md` | Roles Akademik | Penulisan skripsi & presentasi |

### Kustomisasi Prompt

Prompt bisa dikustomisasi per-stage melalui:
1. **UI Settings**: Edit prompt langsung di halaman Settings
2. **API**: `PUT /api/settings/stages/:stageId/prompt`
3. **File**: Edit file `.md` di `src/prompts/`

Prioritas: Custom Prompt (DB) → Prompt File → Legacy Fallback

---

## 🌐 Fitur Internet Tools

Agen AI bisa mengakses internet selama eksekusi stage:

### Web Search

```
---WEBSEARCH:metode penelitian kualitatif---
```
Mencari di DuckDuckGo, mengembalikan 5 hasil teratas beserta snippet.

### Web Scrape

```
---WEBSCRAPE:https://example.com/article---
```
Membaca konten halaman web, strip HTML tags, mengembalikan teks bersih (maks 20.000 karakter).

### Alur Kerja Multi-Turn

1. AI menulis respons dengan tag `---WEBSEARCH:...---` atau `---WEBSCRAPE:...---`
2. Sistem otomatis menjalankan pencarian/scraping
3. Hasil dikirim kembali ke AI sebagai pesan user
4. AI melanjutkan penulisan berdasarkan referensi yang didapat
5. Maks **3 turns** pencarian per sesi stage

---

## 📄 Office Converter

Module `src/utils/officeConverter.js` menangani konversi format dokumen:

### Markdown → Word (.docx)
- Konversi via `marked` → HTML → `html-to-docx`
- Styling profesional: font Arial, heading hierarchy, table borders
- Mendukung: headers, paragraf, list, tabel, code blocks

### Markdown → PowerPoint (.pptx)
- Parsing otomatis: `---` atau `# Heading` = slide baru
- Template visual: background cream (#F4F0EA), border neobrutalist
- Mendukung: judul, bullet points, numbered lists

### Markdown Table → Excel (.xlsx)
- Parsing tabel markdown (`| col1 | col2 |`)
- Auto-fit column widths
- Fallback: baris biasa → single-cell rows

---

## 🗄️ Database Schema

SQLite database (`data/factory.db`) menggunakan WAL mode untuk performa:

| Tabel | Kegunaan |
|-------|----------|
| `projects` | Data proyek (id, name, task, template, stages) |
| `pipeline_state` | State FSM, kanban, dan daftar file per proyek |
| `chat_log` | Log percakapan agen AI (role, message, stage, timestamp) |
| `office_config` | Konfigurasi office aktif (template, stages, AI settings) |
| `custom_templates` | Template custom buatan pengguna |

---

## 🤝 Kontribusi

1. Fork repository ini
2. Buat branch fitur (`git checkout -b fitur/fitur-baru`)
3. Commit perubahan (`git commit -m 'Tambah fitur baru'`)
4. Push ke branch (`git push origin fitur/fitur-baru`)
5. Buat Pull Request

---

## 📝 Lisensi

Proyek ini menggunakan lisensi [ISC](https://opensource.org/licenses/ISC).

---

<p align="center">
  Dibuat dengan ❤️ oleh <strong>rikoarik</strong>
</p>
