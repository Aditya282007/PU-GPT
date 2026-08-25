# PU-GPT — Parul University Curriculum Assistant

A self-hosted curriculum question-answering system for Parul University. Teachers upload course materials, students ask questions and get cited answers grounded strictly in that material.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Vector Store**: Chroma (dev) → Qdrant (production)
- **LLM**: Ollama (Qwen3-30B-A3B for answers, Phi-4-14B for reasoning)
- **Embeddings**: bge-m3 via Ollama
- **Auth**: JWT with role-based access (student/teacher/admin)

## Prerequisites

- Node.js 18+
- MongoDB 6+
- Ollama (for LLM serving)
- Chroma (for vector storage)

## Quick Start

### 1. Start Required Services

```bash
# Start MongoDB (if not running as service)
mongod

# Start Chroma
docker run -p 8000:8000 chromadb/chroma

# Start Ollama and pull models
ollama serve
ollama pull qwen3:30b-a3b
ollama pull phi4:14b
ollama pull bge-m3
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your settings if needed
```

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Run Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
PU-GPT/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── models/         # MongoDB models (User, Document, Conversation, FlaggedQuestion)
│   │   ├── routes/         # API routes (auth, documents, chat, teacher, admin)
│   │   ├── services/       # Business logic (ingestion, chat)
│   │   ├── utils/          # Utilities
│   │   └── index.js        # Entry point
│   └── uploads/            # Uploaded files
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context (Auth, Theme)
│   │   ├── pages/          # Page components
│   │   ├── utils/          # API client
│   │   ├── styles/         # Global styles
│   │   ├── App.jsx         # Main app with routing
│   │   └── main.jsx        # Entry point
│   └── index.html
└── master_build_prompt.md  # Project specification
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (admin-provisioned for teachers)
- `GET /api/auth/me` - Get current user

### Documents (Teacher/Admin)
- `POST /api/documents/upload` - Upload document (multipart)
- `GET /api/documents` - List documents with filters
- `GET /api/documents/subjects` - Get unique subjects
- `DELETE /api/documents/:id` - Delete document

### Chat (Student)
- `POST /api/chat/ask` - Ask question (streams response)
- `GET /api/chat/history` - Get conversation history
- `GET /api/chat/history/:id` - Get single conversation
- `DELETE /api/chat/history/:id` - Delete conversation
- `GET /api/chat/flagged` - Get flagged questions

### Teacher
- `GET /api/teacher` - List flagged questions
- `POST /api/teacher/:id/respond` - Respond to flagged question
- `GET /api/teacher/insights` - Get topic insights

### Admin
- `GET /api/admin/departments` - List departments
- `POST /api/admin/departments` - Create department
- `DELETE /api/admin/departments/:name` - Delete department
- `GET /api/admin/subjects` - List subjects
- `POST /api/admin/subjects` - Create subject
- `POST /api/admin/teachers` - Create teacher account
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/role` - Update user role
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/status` - System status

## Roles

- **Student**: Ask questions, view history, see flagged questions
- **Teacher**: Upload documents, manage library, respond to flagged questions, view insights
- **Admin**: Manage departments/subjects, user management, system status

## Design System

The UI follows a "chalkboard and annotated textbook" design language:
- **Colors**: Chalkboard (#1E2B24), Chalk (#EDEDE3), Amber Chalk (#E8B84B), Rule Line (#3A4A40), Sage (#7FA88F), Rust (#C1694F)
- **Typography**: Source Serif 4 (display), Inter/IBM Plex Sans (body), IBM Plex Mono (citations)
- **Citations**: Margin notes with leader lines (desktop) / expandable bottom sheets (mobile)

## Production Deployment

1. Replace Chroma with Qdrant for vector storage
2. Use a reverse proxy (nginx) for frontend/backend
3. Set up MongoDB with authentication
4. Configure environment variables for production
5. Use PM2 or similar for process management
6. Set up SSL/TLS certificates

## License

Internal use only — Parul University