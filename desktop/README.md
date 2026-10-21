# MH Browser for Windows — Android parity port

This desktop app is implemented separately from the original Android Java app in `app/`. **No Android application files were removed or edited.** A native Windows implementation cannot execute Android System WebView and Android services directly, so behavior must be recreated and tested.

## Build the Windows installer

The GitHub Actions workflow `.github/workflows/windows-desktop.yml` uses Windows, Node.js 22, Python/Pillow, Electron, NSIS and FFmpeg to produce an installer artifact. It downloads a Windows FFmpeg distribution for HLS stream merging and optional MP3 conversion. There is no yt-dlp dependency.

To build locally, generate `desktop/build/mh-browser.ico`, `desktop/build/installer-sidebar.bmp` and `desktop/build/installer-header.bmp` from `desktop/ui/assets/mh-logo.webp` as done in CI, install Node.js 22 and put Windows `ffmpeg.exe` and `ffprobe.exe` in `desktop/media-tools/` first:

```powershell
cd desktop
npm install
npm run dist
```

The unsigned Windows installer is written to `desktop/dist/MH-Browser-Setup-1.0.0.exe` when packaging succeeds.

## Implemented desktop capabilities

- Chromium tabs, session restoration, new private tabs and isolated private session storage
- Windows navigation, URL/search bar, Google search, bookmarks, history, home shortcuts and dark/light themes
- Per-tab desktop/mobile user-agent toggle, keyboard shortcuts, in-page find, page-link copying
- Basic ad/tracker host filtering and website permission prompts
- Direct website downloads with progress, pause, resume, cancel, open and file deletion
- Download list and journal, per-item selection, bulk deletion, date filters and persistent completed media records
- Floating media download action on pages with HTML5 media and supported media-page URLs
- Chromium network response inspection and HTML5 media source discovery without yt-dlp, plus accessible HLS resolution selection, original file downloads, optional MP3 conversion and FFmpeg merging
- Native Chromium website downloads, plus FFmpeg HLS/MP3 conversion while the browser is running
- HTTP/HTTPS/SOCKS5 proxy configuration with session-only credentials, local network diagnostics and consent-based IP location lookup
- MH logo on the home screen, branded Windows EXE/installer/uninstaller icons and installer artwork
- Compact Android-blue/dark theme with light theme toggle, private-tab home view and organized page tools
- Print, save page, fullscreen, page zoom (Ctrl+plus/minus), translation link, local unpacked Chromium extension loading
- Persistent regular browsing session for website cookies (subject to provider login restrictions)
- Windows NSIS setup packaging, Start menu and desktop shortcuts

## Known gaps and testing requirements

**This port is not yet verified to have exact feature parity with the Android application.** Android and Windows media engines differ. Playback, cookies, site-specific authentication, extractor restrictions, browser-specific privacy controls, detailed ad lists, every Android settings toggle, shortcut editing, complete direct-download persistence and OS-specific split-screen behavior require further parity review and real Windows testing. There is no yt-dlp, extractor auto-update cycle, or fixed 90-day media component expiry. Media discovery observes actual Chromium media requests and HTML5 media sources; it does not scrape websites. DRM, encrypted/restricted streams, blob-only media without accessible source URLs, and many websites that do not expose ordinary playable media URLs are not supported. HLS/MP3 conversion jobs cannot currently pause/resume or show accurate percentage; normal Chromium file downloads can. FFmpeg still needs security and compatibility updates as part of normal application maintenance. Some website login providers restrict embedded browsers. The installer is unsigned.

**Chrome Web Store one-click extension installation, Google Chrome account/profile sync, password-manager parity, Lens, tab groups and Chrome Cast are not implemented.** Installing unpacked compatible extensions is different from supporting the entire Chrome Web Store. Logging into a Google website does not sync the browser's own bookmarks, passwords, or history. NSIS wizard pages remain native Windows controls with custom MH branding rather than a fully custom dark-themed installer. The browser requires real Windows testing for keyboard input, page rendering, playback and UI behavior; passing GitHub Actions proves only packaging.

The existing Android application and source are the functional reference; do not delete features or merge this branch as a final parity release until each relevant behavior has been compared and validated.
