# 🎓 Certificate Generator

A fast, browser-based bulk certificate generator. Upload a certificate template, map your Excel/CSV data columns onto it using a visual drag-and-drop canvas editor, and download all certificates as a ZIP file — all without any cloud service.

---

## ✨ Features

- **Visual Canvas Editor** — Drag, position, and style text fields directly on the template using Fabric.js
- **Excel & CSV Support** — Import `.xlsx`, `.xls`, or `.csv` data files
- **Custom Fonts** — Choose from 14 bundled Google Fonts or upload your own TTF/OTF
- **Live Preview** — Preview a sample certificate before bulk generation
- **Bulk Generation** — Generate hundreds or thousands of certificates efficiently
- **ZIP Download** — All certificates packaged as a single downloadable ZIP
- **Server-side Rendering** — Uses `@napi-rs/canvas` for pixel-accurate PNG output

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3 |
| Canvas Editor | [Fabric.js 5](http://fabricjs.com/) |
| Server Rendering | [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) |
| Data Parsing | `xlsx`, `csv-parse` |
| Archiving | `jszip` |

---

## 📋 Prerequisites

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **npm** v9 or higher (bundled with Node.js)

Check your versions:

```bash
node -v   # should print v18.x.x or higher
npm -v    # should print 9.x.x or higher
```

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/enactusiitr/Tools.git
```

### 2. Install dependencies

```bash
npm install
```

> `@napi-rs/canvas` ships prebuilt binaries — no build tools (Python, gcc) required.

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and adjust if needed (the defaults work for local development):

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

---

## 🗂 Project Structure

```
certificate-generator/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── fonts/              # GET list fonts, POST upload custom font
│   │   │   └── upload/
│   │   ├── generate/           # POST bulk generate, GET serve file
│   │   │   └── serve/
│   │   ├── upload-excel/       # POST parse Excel/CSV
│   │   └── upload-template/    # POST upload template, GET serve image
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Main multi-step UI
│
├── components/
│   ├── CanvasEditor.tsx        # Fabric.js drag-and-drop editor
│   ├── DataPreview.tsx         # Uploaded data table preview
│   ├── FieldConfigPanel.tsx    # Font / color / size controls per field
│   ├── FileUpload.tsx          # Drag-and-drop file upload widget
│   ├── PreviewModal.tsx        # Single certificate preview modal
│   └── StepIndicator.tsx       # Step progress indicator
│
├── services/
│   ├── certificateService.ts   # Core: render PNGs using @napi-rs/canvas
│   ├── excelService.ts         # Excel/CSV parsing
│   ├── fontService.ts          # Google Font auto-download & registration
│   └── zipService.ts           # Streaming ZIP creation
│
├── lib/
│   ├── api.ts                  # Client-side API wrappers
│   ├── constants.ts            # Paths, limits, helpers
│   └── types.ts                # Shared TypeScript interfaces
│
├── fonts/                      # Auto-downloaded & custom fonts (git-ignored)
├── uploads/                    # Uploaded templates (git-ignored)
├── generated/                  # Generated certificates & ZIPs (git-ignored)
│
├── .env.example                # Environment variable template
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## 📖 Usage Guide

### Step 1 — Upload Template
Upload a certificate background image (PNG or JPG, max 10 MB).

### Step 2 — Upload Data
Upload an Excel (`.xlsx`/`.xls`) or CSV file. The first row must be the header row with column names.

### Step 3 — Map Fields
Use the visual canvas editor to:
- **Click anywhere on the template** to add a text field
- **Drag** fields to exact positions
- Configure **font family, size, color, alignment, and max width** per field
- Map each field to the correct data column

### Step 4 — Preview & Generate
- Click **Preview** to generate a sample certificate from the first data row
- Click **Generate All** to bulk-generate all certificates
- Download the resulting **ZIP file**

---


## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL of the app |

---
