# Care Assist

**AI-powered live chat & lead capture platform built for behavioral health and treatment centers.**

Care Assist helps addiction treatment facilities convert more website visitors into admissions through an intelligent chat widget that captures leads 24/7 — with built-in HIPAA compliance, crisis detection, and seamless human handoff.

---

## ✨ Features

- **AI Chat Widget** — Embeddable, white-labeled chat that captures visitor info naturally through conversation
- **Crisis Detection** — Real-time keyword monitoring with automatic SAMHSA helpline integration
- **HIPAA Compliance** — PHI audit logs, configurable data retention, session timeouts, and 2FA
- **Human Handoff** — Seamless escalation from AI to live agents with full conversation context
- **Multi-Property Support** — Manage multiple treatment centers from a single dashboard
- **Integrations** — Salesforce CRM export, Slack notifications, Google Calendar, Gmail
- **Analytics** — Lead conversion tracking, page analytics, and ROI reporting
- **Proactive Messaging** — Configurable auto-greetings and engagement triggers
- **Natural Lead Capture** — AI extracts name, phone, email, and insurance info mid-conversation
- **Geo-Filtering** — Restrict or customize responses based on visitor location

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Supabase (Auth, Database, Edge Functions, Storage) |
| Data Fetching | TanStack Query |
| Routing | React Router v6 |
| Animations | GSAP, Framer Motion |
| Forms | React Hook Form + Zod |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm or bun

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd care-assist

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run build:dev` | Development build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
```

---

## 📁 Project Structure

```
src/
├── assets/          # Images, logos, personas
├── components/
│   ├── admin/       # Admin dashboard components
│   ├── agent/       # Agent-facing components
│   ├── auth/        # Authentication (2FA, login)
│   ├── dashboard/   # Main dashboard UI
│   ├── docs/        # Documentation viewer
│   ├── landing/     # Marketing & sales pages
│   ├── pricing/     # Pricing section
│   ├── settings/    # Settings panels (Slack, Salesforce, HIPAA, etc.)
│   ├── sidebar/     # Navigation sidebar
│   ├── ui/          # shadcn/ui primitives
│   ├── video/       # Video call components
│   └── widget/      # Embeddable chat widget
├── data/            # Mock data & constants
├── hooks/           # Custom React hooks
├── integrations/    # Supabase client & types
├── pages/           # Route pages
├── types/           # TypeScript type definitions
└── utils/           # Utility functions

supabase/
├── functions/       # Edge Functions (AI chat, notifications, OAuth, etc.)
└── migrations/      # Database migrations
```

---

## 📄 License

Proprietary. All rights reserved.
