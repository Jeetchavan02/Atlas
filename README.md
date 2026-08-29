<div align="center">
  <h1 align="center">ATLAS 🪐</h1>
  
  <p align="center">
    <strong>Breaking productivity barriers. Empowering your daily life with a proactive, J.A.R.V.I.S.-style personal AI operating system.</strong>
  </p>
  
  <div align="center">
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-18-007ACC.svg?style=for-the-badge&logo=react" alt="React" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?style=for-the-badge&logo=typescript" alt="TypeScript" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-3.0-38B2AC.svg?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" /></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-18-339933.svg?style=for-the-badge&logo=nodedotjs" alt="Node.js" /></a>
    <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB-8-47A248.svg?style=for-the-badge&logo=mongodb" alt="MongoDB" /></a>
    <a href="https://groq.com/"><img src="https://img.shields.io/badge/Groq-Llama_3-F55036.svg?style=for-the-badge" alt="Groq" /></a>
  </div>
</div>

---

## 🚀 The Vision

In a world increasingly driven by digital noise and fragmented data, staying on top of personal health, habits, and tasks can feel overwhelming. **ATLAS** (A Life Tracking Analysis System) is our answer. It is a state-of-the-art personal operating system that fuses health metrics, task management, and multimodal AI into a single, cohesive application.

Why did we build this? Because tracking your life shouldn't require a dozen disconnected apps. We wanted to build a unified, proactive digital assistant that understands the context of your day—how you slept, what you need to do, and your fitness goals—delivering insights with cutting-edge AI directly to your browser for absolute speed and privacy.

---

## ✨ Premium Features

### 🧠 Intelligent AI Assistant
Context-aware conversations with a sophisticated, J.A.R.V.I.S.-style persona using ultra-fast LLM inference. It dynamically reads your live database to inform its answers.

### 🌐 Live Web Search
Automatically fetches real-time data and facts when you ask questions, instantly parsing the live web to keep answers accurate and up-to-date.

### ❤️ Health & Fitness Tracking
Total integration of your physical metrics:
- **Daily Biometrics:** Integrates and contextualizes sleep, HRV, RHR, and daily activity scores.
- **Gym Sessions:** Tracks workout volume, PRs, cardiovascular strain, and recovery metrics.

### ✅ Productivity & Habits
Keeps your life organized and on track:
- **Task Management:** Real-time prioritization of daily and weekly tasks.
- **Habit Streaks:** Advanced streak tracking for mindfulness, fitness, and nutrition goals.

---

## 💻 Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (running locally on port 27017 or a remote URI)
- npm or yarn

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jeetchavan02/Atlas.git
   cd Atlas
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Add your GROQ_API_KEY to the .env file
   
   # Seed the database with sample data
   npm run seed
   
   # Start the backend engine
   npm run dev
   ```

3. **Frontend Setup**
   Open a new terminal window in the root `Atlas` directory:
   ```bash
   npm install
   npm run dev
   ```

4. **Experience the app**
   Open `http://localhost:5173` in your browser.

---

## 👥 The Creator

Designed, engineered, and shipped by:

- **Jeet Chavan**

<br/>

<div align="center">
  <p>Built with ❤️ to optimize your daily life.</p>
</div>
