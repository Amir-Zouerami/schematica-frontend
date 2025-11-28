# 📘 Schematica Frontend

![Schematica Cover](https://github.com/user-attachments/assets/e73d72fd-3d32-4300-b8c7-b023c3e687ec)

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Schematica** is a modern, collaborative API documentation platform built to bridge the gap between backend implementation and frontend consumption. It serves as a visual editor and viewer for OpenAPI 3.0 specifications, featuring real-time collaboration locks, optimistic UI updates, and a design-first philosophy.

> This repository contains the **Single Page Application (SPA)** source code.
> Backend code as available at: https://github.com/Amir-Zouerami/schematica-api

> **Note:** This project serves as a technical showcase. It was originally developed as an internal tool to solve specific workflow friction points in my previous engineering team.

---

## ✨ Key Features

*   **Design-First Editor:** robust form-based editor for OpenAPI specs (Paths, Methods, Schemas) without needing to write raw YAML/JSON manually.
*   **Real-Time Concurrency Control:** Implements a WebSocket-based locking mechanism (`Socket.IO`) to prevent race conditions when multiple developers edit the same endpoint.
*   **Smart cURL Import:** Paste a cURL command, and the system auto-generates the OpenAPI path, parameters, and request body schema using WASM-powered parsing.
*   **Optimistic UI:** Interactions feel instant. The UI updates immediately while the server processes the request in the background, rolling back gracefully on errors.
*   **Type-Safe Schemas:** Uses auto-generated TypeScript definitions derived directly from the backend OpenAPI spec, ensuring frontend-backend contract alignment.
*   **Dark Mode Native:** Built with a "dark-first" aesthetic using Tailwind CSS v4 and Shadcn UI.

---

## 🏗 Architecture & Tech Stack

This codebase was architected with scalability and maintainability in mind, moving away from "spaghetti code" towards a structured, domain-driven approach.

### 1. Feature-Sliced Design (FSD) Adaptation
The project structure is loosely based on **Feature-Sliced Design**. It avoids the trap of organizing by "file type" (components/hooks/utils) and instead organizes by **business domain**:

*   **`app/`**: Global providers, styles, and store initialization.
*   **`pages/`**: Route-level components (lazy loaded).
*   **`widgets/`**: Compositional layers that combine features (e.g., `EndpointDetail`, `AuditTrail`).
*   **`features/`**: User interactions that bring value (e.g., `create-project`, `edit-endpoint`). Contains the form logic and UI triggers.
*   **`entities/`**: Business entities (User, Project, Endpoint). Contains the data fetching logic (queries/mutations) and types.
*   **`shared/`**: Reusable UI primitives (buttons, inputs), generic hooks, and utility libraries.

### 2. Core Technologies

*   **React 19 & Vite 6:** Leveraging the latest React features and the blazing fast build times of Vite.
*   **TanStack Query v5:** Handles server state, caching, invalidation strategies, and optimistic updates. This effectively removes the need for a global client-state store for API data.
*   **Zustand:** Used sparingly for actual *client* state (e.g., UI preferences, active server selection) that doesn't belong in the URL or the Server Cache.
*   **React Hook Form & Zod:** Schema-based form validation. We define the shape of the data once in Zod, and it drives the form validation and type inference.
*   **Monaco Editor:** Embedded VS Code experience for editing raw JSON schemas.
*   **Biome:** Used for lightning-fast linting and formatting, replacing the slower ESLint/Prettier combo in parts of the workflow.

---

### 🔍 Type Safety Philosophy

**`any` is strictly forbidden.**

This project uses a dual-layer typing strategy:
1.  **Generated Types:** `src/shared/types/api-types.ts` is auto-generated from the Backend's Swagger JSON. This ensures that if the Backend changes a DTO, the Frontend build fails immediately.
2.  **Strict Bridging:** We use TypeScript interfaces to "bridge" the gap between the loose OpenAPI JSON structure (which allows arbitrary keys) and our strict React component props, ensuring runtime safety without casting to `any`.

---

## 🛠 Technical Deep Dives

### ⚡ WASM-Powered cURL Parsing
One of the standout features of Schematica is the ability to "Paste cURL" to generate an endpoint. Instead of using a heavy JS-based parser or regex that breaks easily, we use **WebAssembly (WASM)**.

We utilize `tree-sitter` compiled to WASM to parse the Bash AST of the cURL command. This allows us to extract headers, body params, and URLs with the same robustness as a compiler.

*   **Implementation:** The WASM files (`tree-sitter.wasm`, `tree-sitter-bash.wasm`) live in the `public/wasm` directory.
*   **Why WASM?** Parsing complex shell commands with nested quotes and escaped characters is CPU intensive and error-prone in pure JavaScript regex. WASM provides near-native parsing speed and accuracy.
*   **Loader Trick:** You might notice `src/curlconverter-wasm-loader.ts`. This file patches the global scope to tell the `curlconverter` library exactly where to find our static `.wasm` assets, bypassing its default behavior of fetching from a CDN.

### 🔒 Optimistic Concurrency & Locking
To handle multi-user collaboration, we implement a two-layer concurrency strategy:

1.  **Optimistic Locking (HTTP):**
    Every "Update" request sends a `lastKnownUpdatedAt` timestamp. The backend compares this against the database record.
    *   *Scenario:* User A opens an endpoint. User B opens the same endpoint and saves a change. User A tries to save.
    *   *Result:* The API returns `409 Conflict`.
    *   *UI Handling:* A specialized "Conflict Resolution" dialog appears, showing a diff of User A's changes vs. the new Server State, allowing User A to overwrite or discard.

2.  **Pessimistic Locking (Socket.IO):**
    When a user clicks "Edit Endpoint", the frontend emits a `lock_acquire` event.
    *   *Effect:* Other connected clients viewing that endpoint immediately see a "Locked by [User]" badge and the edit button becomes disabled.
    *   *Auto-Release:* The lock is automatically released via the `useBeforeUnload` hook if the tab is closed, or if the socket disconnects.

### 🧩 Dynamic Schema Resolution
OpenAPI specs are full of `$ref` pointers (e.g., `"$ref": "#/components/schemas/User"`). Rendering these raw is useless to a human.

We implemented a recursive resolver in `src/shared/lib/schemaUtils.ts` that:
*   Traverses the JSON structure deeply.
*   Resolves local references instantly.
*   Detects **Circular Dependencies** (e.g., A User has a Team, which has Users...) and halts recursion gracefully to prevent stack overflows, rendering a `[Circular Reference]` badge instead.

---

## 🚀 Installation & Setup

This frontend is designed to be served statically by the backend in production, but runs independently during development.

### Prerequisites
*   **Node.js 20+**
*   **Bun** (Preferred package manager, though `npm`/`pnpm` work)
*   **Backend Running:** You need the API running locally. [Get the Backend Here](https://github.com/Amir-Zouerami/schematica-api).

### Development Mode

1.  **Clone the Repo:**
    ```bash
    git clone https://github.com/Amir-Zouerami/schematica-frontend.git
    cd schematica-frontend
    ```

2.  **Install Dependencies:**
    ```bash
    bun install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root:
    ```env
    VITE_API_URL=http://localhost:3000
    VITE_WEBSOCKET_URL=http://localhost:3000
    VITE_BRAND_NAME=Schematica
    ```

4.  **Run Development Server:**
    ```bash
    bun dev
    ```
    The app will be available at `http://localhost:8080`.

---

## 📦 Production Build Strategy

To simplify deployment, Schematica is designed to be served directly by the NestJS backend. We avoid the complexity of maintaining two separate production servers (Frontend vs. Backend) by compiling the SPA into static assets.

### Side-by-Side Directory Assumption
The `vite.config.ts` is configured with a specific `outDir` strategy. It assumes you have cloned the frontend and backend repositories **side-by-side** in the same parent directory:

```text
/workspace
  ├── schematica-api/      <-- NestJS Backend
  └── schematica-frontend/ <-- This Repo
```

### Building for Deployment

When you run the build command:

```bash
bun run build
```

Vite will:
1.  Compile the TypeScript/React code to optimized ES2022 JavaScript.
2.  Chunk vendor libraries (React, Monaco Editor) separately for better caching.
3.  **Output the files directly into `../schematica-api/public`**.

Once built, you simply start the Backend, and it serves the Frontend at the root URL (`/`). This creates a monolithic-feeling deployment artifact while maintaining a decoupled development experience.

> **⚠️ Important regarding WASM:**
> The build process expects the `.wasm` files to be present in the public assets. If you change the build pipeline, ensure `public/wasm/*.wasm` files are copied correctly to the final dist folder, or the cURL converter will fail silently.

---

## 🤝 Contribution Policy

This project is open-source under the **MIT License**, and I highly encourage you to fork it, tear it apart, and rebuild it to fit your own team's workflows.

**However, I am not accepting Pull Requests at this time.**

This repository serves three primary purposes:
1.  **A Portfolio Piece:** It demonstrates my architectural decisions, coding standards, and approach to complex frontend engineering.
2.  **Helping The Community:** It gives back to the community i hold so dearly, the open-source community. If you need such a platform for you company, feel free to use it.
3.  **An Archive:** It preserves the state of an internal tool I built for a specific company context.

While I won't be merging external code, I am happy to discuss the architecture or answer questions in the [Issues](https://github.com/Amir-Zouerami/schematica-frontend/issues) tab.

---

## 📄 License

This project is [MIT](https://opensource.org/licenses/MIT) licensed.

<br />

<div align="center">
  <sub>Built with 💙, in a hurry, and with way too much caffeine.</sub>
</div>