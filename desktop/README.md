# MH Browser for Windows — Android parity port

This desktop app is implemented separately from the original Android Java app in `app/`. **No Android application files were removed or edited.** A native Windows implementation cannot execute Android System WebView and Android services directly, so behavior must be recreated and tested.

## Build the Windows installer

The GitHub Actions workflow `.github/workflows/windows-desktop.yml` uses Windows, Node.js 22, Electron, NSIS, yt-dlp and FFmpeg to produce an installer artifact. It downloads official yt-dlp and a Windows FFmpeg distribution during the CI build.

To build locally, install Node.js 22 and put Windows `yt-dlp.exe`, `ffmpeg.exe` and `ffprobe.exe` in `desktop/media-tools/` first:

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
- Windows yt-dlp public media format lookup, video resolution selection, MP3/M4A extraction and FFmpeg merging
- Background media extraction subprocesses while the browser is running, retries and progress reporting
- HTTP/HTTPS/SOCKS5 proxy configuration with session-only credentials, local network diagnostics and consent-based IP location lookup
- Windows NSIS setup packaging, Start menu and desktop shortcuts

## Known gaps and testing requirements

**This port is not yet verified to have exact feature parity with the Android application.** Android and Windows media engines differ. Playback, cookies, site-specific authentication, extractor restrictions, browser-specific privacy controls, detailed ad lists, every Android settings toggle, shortcut editing, complete direct-download persistence and OS-specific split-screen behavior require further parity review and real Windows testing. The yt-dlp extractor cannot guarantee all websites or protected/DRM streams. Some website login providers restrict embedded browsers. The installer is unsigned.

The existing Android application and source are the functional reference; do not delete features or merge this branch as a final parity release until each relevant behavior has been compared and validated.
