# MH Browser for Windows — desktop implementation

The Android browser remains unchanged in `app/`. This is an independent, native Windows desktop application using Electron and Chromium. It is **not** the Android APK running in an emulator.

## Windows build

Install current Node.js LTS on Windows. In a PowerShell terminal:

```powershell
cd desktop
npm install
npm run start
npm run dist
```

The Windows NSIS installer is emitted under `desktop/dist/MH-Browser-Setup-1.0.0.exe`. CI can also produce the installer as a GitHub Actions artifact. This repository change alone does not constitute a tested or signed Windows installer.

## Included first desktop pass

Chromium site rendering; tabs and private partitions; Google URL search, shortcuts, home screen; bookmarks and history; desktop layout; dark/light themes; basic ad and tracker host blocking; direct downloads with status, pause/resume/cancel/open/remove/delete and Today/Previous Day/Week/Monthly/Yearly/All filters; browser keyboard shortcuts; in-page search; download history during active app session; cookies and site storage isolated per profile; Windows setup builder.

## Android parity still required

The Android Java/WebView media-engine stack cannot execute directly under Electron. A Windows-specific integration for yt-dlp/FFmpeg media format extraction, background transfers, MP3 conversion, persistent download journal, fine-grained proxy configuration, website permission controls, advanced settings, and the remaining specialized Android UI must be implemented and verified before claiming full feature parity. Do not assume DRM/restricted streaming is downloadable. Google can still restrict embedded-browser login. The default block lists are intentionally smaller than Android's curated community rules.

Security: Electron desktop windows use context isolation and sandboxing. External custom URI schemes open via Windows; no arbitrary OS command execution is exposed. Local files and developer tools are accessible through standard browser functionality. Test installer signing, SmartScreen reputation and common navigation/storage/media scenarios before releasing to end users.
