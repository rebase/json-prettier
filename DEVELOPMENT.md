# For Developers

## 🛠️ Building from Source

### Prerequisites

- Node.js (v16 or higher)
- Rust (latest stable)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/rebase/json-prettier.git
cd json-prettier

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## 📦 Open Source Libraries Used

**Frontend:**

- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor component
- [Lucide React](https://lucide.dev/) - Icon library

**Backend (Rust):**

- [Tauri](https://tauri.app/) - Desktop app framework
- [Serde](https://serde.rs/) - Serialization/deserialization
- [Serde JSON](https://docs.rs/serde_json/) - JSON handling
