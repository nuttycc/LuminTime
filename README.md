<h1 align="center">LuminTime</h1>

<p align="center">
  A privacy-first browser extension that automatically tracks your online activity.<br>
  All data stays local, no cloud, no account required.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/lumin-time/elfkjlledpjmjehekdklejboanfbffak">
    <img src="docs/chrome-web-store-badge.svg" height="24" />
  </a>
</p>

<p align="center">
  <img src="docs/screenshots/UI Design Screenshot.png" width="80%" alt="LuminTime UI Screenshot" style="border: 1px solid #30363d; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);" />
</p>

<br/>

## ⚡️ Key Features

- **Background Session Tracking** – Monitors active tabs and captures time spent per domain and page.
- **Local-First Storage** – All data stored securely in IndexedDB; nothing is ever synced to the cloud.
- **Time Analytics** – View daily and hourly trends with precise time spent per site.
- **Zero Telemetry** – Complete data ownership and privacy by design.

## 🛠️ Built With

- **Framework:** [WXT](https://wxt.dev/) (Web Extension Toolkit) & [Vue 3](https://vuejs.org/)
- **Storage:** IndexedDB via [Dexie.js](https://dexie.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) & [DaisyUI v5](https://daisyui.com/)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A modern Chromium-based browser (Chrome, Edge, Brave, etc.)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/nuttycc/LuminTime.git
   cd LuminTime
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Start the development server:**

   ```bash
   pnpm run dev
   ```

4. **Load the extension in your browser:**
   - Open `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `.output/chrome-mv3` folder.

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.

Copyright &copy; 2026-present [nuttycc](https://github.com/nuttycc).
