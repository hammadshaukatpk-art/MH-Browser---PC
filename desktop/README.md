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

## October 21 desktop UI / installer revision

- The Windows NSIS installer now uses a guided installer/uninstaller wizard with confirmation and progress pages with the MH app icon instead of the multi-step installation-options wizard. The setup/uninstaller still use Windows native dialogs, and an unsigned installer may trigger a Windows Unknown Publisher / Run warning. This cannot be removed by theme changes; production distribution requires trusted code signing and reputation.
- The CI branding step creates an alpha-masked 512px UI logo from the repository's existing 128px logo source and a 256px ICO. Upscaling improves display size and removes white corners, but it does not recreate the detail of the original full-resolution logo; replacing the source with the original high-resolution artwork remains recommended.
- Browser menu panels, proxy form, confirmation/input dialogs, slim scrollbars, Instagram/Pinterest shortcuts and WhatsApp SVG were redesigned. Website permission prompts use the MH dialog UI. Native OS file dialogs remain native.
- The toolbar includes a browser profile entry for opening Google sign-in, Gmail, YouTube and Google's sign-out page. This does **not** provide Chrome account synchronization, the signed-in Google account avatar/email, password sync, or guaranteed Google authentication on Electron; Google's sign-in policies can block embedded Chromium clients.
- Installed compatible unpacked Chromium extensions are represented by toolbar icons and their action popups are attempted when supported. This does **not** enable universal Chrome Web Store one-click installs, complete extension API compatibility, or Chrome profile sync.
- A successful installer build verifies packaging, not real Windows behavior. Test keyboard focus, tab rendering, streaming, website sign-in, extensions and native permissions on a Windows machine before releasing.

## Windows 1.0 UI follow-up

- The top-right Google account button now displays a multicolor Google G and opens an MH-themed account menu instead of immediately navigating to Google's sign-in page. The account menu offers sign-in, Google Account management, Gmail, YouTube, and sign-out.
- Google can initiate a Windows Security / passkey challenge as part of its own login flow. MH Browser does not suppress WebAuthn or bypass verification; cancel and use Google's 'Try another way' option when offered. An unsigned EXE may also be labeled unverified by Windows until properly code-signed.
- Back from Google authentication attempts to return to the initiating site (e.g., YouTube) or MH home when sign-in began from the home page.
- Settings use expandable category cards with aligned descriptions and switches. Extensions are grouped under 'Chrome Web Store Extensions', but installing directly from the store is still not implemented.
- The About page displays only MH Browser / Version 1.0.0, Company: MasoomDev, and Developer: MH Developers. No WhatsApp link is included.
- Installer/uninstaller now use guided confirmation and progress pages instead of one-click removal. NSIS still uses native Windows dialog controls; complete dark styling requires a custom installer UI.
- WhatsApp and Pinterest SVG icons use standard vector paths, and the logo is sharpened and rendered with transparency. A true high-resolution master logo is still needed for lossless HD branding.

## Installer branding, profile and session lifetime

- The installer and uninstaller now use the MH dark-navy Modern UI palette where NSIS permits, a branded welcome screen and a simplified current-user installation path. Native Windows installation progress controls, window chrome, and Windows trust prompts are still owned by Windows/NSIS; a completely Chrome-like custom installer would require replacing the NSIS UI architecture.
- The source logo is rebuilt at 768px with a real alpha channel and fringe cleanup; the same clean PNG is used in the home page and the multi-resolution ICO is used for the taskbar, installer, uninstaller and shortcuts. Installer sidebar text is horizontally centered.
- The Add Shortcut tile has its label at the top and a large centered plus symbol.
- **Normal browser close/reopen:** persistent Chromium session retains website cookies and logins (subject to site policy). Tab restoration follows the Restore previous tabs preference.
- **In-place installer upgrade:** saved website sessions and browser profile are preserved. Electron Builder's NSIS data deletion is explicitly skipped when the uninstall is part of an update.
- **Full uninstall:** deletes the MH Browser application profile, including website cookies, sign-ins, history, bookmarks, saved tabs, shortcuts, and settings. This is irreversible without a backup. Downloaded files saved outside the application profile are not deleted. Reinstalling afterward opens a fresh browser profile.
- A user who wishes to retain accounts across a reinstall should install over the existing version instead of fully uninstalling. Clearing cookies on every normal browser restart is deliberately **not** implemented.

- **Fresh-install migration guard:** the new installer also removes orphaned legacy MH Browser profile directories when it is a genuinely new install (not an update). This handles users who previously uninstalled an older release whose uninstaller left data behind. It does not remove downloaded files from the user's Downloads directory. This is intentionally destructive to old cookies/bookmarks/history on a clean reinstall.

## Download manager and browser tools (October 2026)
- **Fast detection:** network-observed MP4/HLS/audio candidates appear without sequential HLS manifest fetches. For YouTube, Facebook, Instagram, TikTok and Pinterest, optional yt-dlp format inspection runs in the background; the list updates asynchronously and offers quality tiers only when the site exposes them. Protected, inaccessible, paywalled or DRM content is not guaranteed to work. Actual transfer speed depends on the server, connection, media encoding and conversion.
- **Downloads:** active downloads show their status, bytes transferred (B/KB/MB/GB), percentage when the total is known, pause/resume for Chromium-native downloads, cancellation, open/show file, deletion, date filtering and a toolbar activity badge. The browser keeps video visible when starting a media download rather than automatically opening a covering downloads panel. Media conversions and site downloads may not expose a known total or support pause/resume.
- **Writable folders:** default download location is the user's **Downloads/MH Browser** folder; default offline pages location is **Documents/MH Browser/Saved Pages**. Users can choose another folder under Settings > Files and folders. Do **not** save downloads under the executable installation directory (it may be read-only and is removed during uninstall or update).
- **Offline pages:** Menu > Save page saves HTMLComplete (falling back to HTMLOnly if necessary) and records the original URL, title, timestamp and path under Saved pages history. Not all websites allow fully offline preservation; dynamic/DRM pages can be incomplete.
- **Print:** print dialog is requested from the active page after hiding the sidebar. Ctrl+P and Ctrl+S use the same handlers as the menu.
- **PiP:** Settings > Browser > Picture-in-Picture enables the floating-video action. Requires an HTML5 video and website/Chromium support; videos inside inaccessible cross-origin frames may not work.
- **Desktop/mobile:** switches the current tab's user agent and reloads without cache; some responsive sites may ignore the preference. New tabs use the separate Desktop site by default setting.
- **Website permissions:** camera/microphone, location and other supported permissions are requested per HTTPS origin. Approved permissions are remembered until reset under Settings > Privacy and security. Denied prompts can be retried; permission access is not granted automatically. File upload dialogs use Chromium's native file chooser.
- **Translation:** when a page declares a non-English language, a translate button appears by the address bar. Translation currently uses Google Translate's public website translation endpoint in a new tab. This is **not** Chromium's built-in Chrome Translate service, may fail for authenticated/dynamic sites, and cannot guarantee complete translation on every page.
- **Shortcuts:** add the title and URL in a single themed form; icons are retrieved from the website favicon where possible.
- **Security:** web contents remain sandboxed with Node integration disabled. Site extraction does not bypass DRM or website authentication. Persistent cookies are not cleared during normal browsing or updates.
