# Pegasussio Super App

**Pegasussio** is a unified super-app platform that integrates multiple productivity tools into a single, cohesive experience.

## Features

- **Central Hub**: A unified launchpad for all your applications.
- **Micro-Apps**:
  - **Pull Requestio**: A streamlined dashboard for managing GitHub Pull Requests.
    - Dashboard view of watched repos.
    - Create, review, and approve PRs.
    - Search and filter capabilities.
  - **Sprint Planio**: (Coming Soon) Agile sprint planning tool.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Runtime**: Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd pegasussio
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Setup Environment:
   Create a `.env.local` file in the root directory:

   ```bash
   # Comma-separated list of repositories to watch (optional default)
   NEXT_PUBLIC_WATCHED_REPOS=facebook/react,vercel/next.js
   ```

4. Run the development server:

   ```bash
   bun dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## License

MIT
