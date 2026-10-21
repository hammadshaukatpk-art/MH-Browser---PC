# MH Browser Windows — Android Feature Parity and Release Gate

Source of truth: `app/src/main/java/com/mh/browser/BrowserActivity.java` and related Android components. The Windows implementation is under `desktop/`. Do not delete Android features to simplify desktop implementation.

## Locked visual identity

- MH Browser branding and the supplied blue/cyan/purple logo, not Chrome/Brave logos.
- Dark navy (#071326), navy panels (#10223a), blue/cyan accents, with a legible light theme.
- MH start page, quick-access shortcuts, consistent menus and settings, and compact tab/address toolbar.
- Thin scrollbars, aligned forms, matching confirmation dialogs, branded installer and uninstaller.
- A native Windows code-signing certificate is required to address Unknown Publisher warnings. CSS and installer graphics cannot remove Windows trust prompts.

## Feature parity status

| Android feature / requested desktop capability | Windows status | Acceptance test |
| --- | --- | --- |
| Normal tabs, navigation, address search | Implemented in code, device test pending | Open/close/switch 10 tabs, keyboard entry and history navigation |
| Private browsing | Separate temporary Electron session, test pending | Regular cookies unavailable in private; closing private tab discards session |
| Restore tabs | Implemented in code | Close/relaunch; regular tabs restore, private tabs do not |
| Bookmarks | Implemented in code | Save, open, remove, persist after restart |
| History filters and selective deletion | Implemented in code | Today, previous day, week, month, year; select individual/period/all |
| Download filters and selective file deletion | Implemented in code | Check filters, choose individual files, confirm deletion and filesystem results |
| MH quick-access shortcuts | Implemented in code | Google, YouTube, Facebook, WhatsApp SVG, Instagram SVG, Pinterest SVG; add/remove |
| Dark/light themes | Implemented in code | Switch theme across home, menu, settings, proxy, dialogs |
| Proxy HTTP/HTTPS/SOCKS5 | Implemented in code, integration test pending | Connect with/without credentials; disable; ensure password not persisted |
| Ad and tracker blocking | Basic built-in domain lists only | Test blocked ads without breaking common websites; not equivalent to Brave Shields |
| DNT header | Implemented in code | Verify DNT: 1 only when enabled |
| JavaScript and image loading toggles | Implemented in code | Open new tab with JavaScript disabled; block/re-enable image requests |
| Desktop/mobile user-agent | Implemented in code | Open mobile and desktop variants and check actual page layout |
| Location permissions | Implemented in code | Disabled by default; require explicit site approval when enabled |
| Zoom, print, save page, fullscreen | Implemented in code | Ctrl +/-, Ctrl+0, Ctrl+P, Ctrl+S, F11 |
| Network diagnostics | Implemented in code | Local interfaces shown; public IP lookup asks for consent |
| Native HTML5 media detection | Partial | Detect direct MP4/audio/HLS from network and HTML elements |
| HLS to MP4 and MP3 conversion | Partial, uses bundled FFmpeg | Test accessible streams, playlists, audio conversion and cancellation |
| Site-specific social media extraction parity | **Not implemented** | Requires supported lawful extractor approach; protected/DRM streams unsupported |
| Background audio | Chromium behavior; explicit parity test needed | Switch tabs/minimize and verify playback behavior |
| Android split-screen | Windows OS window management differs | Define and test Windows multi-window support separately |
| Chrome Web Store one-click installs | **Not implemented** | Electron is not a complete Chrome extension host |
| Compatible unpacked extensions | Partial | Load, persist, show toolbar icon, invoke action popup, remove |
| Google website cookies/sign-in | Partial; provider may block embedded Chromium | Sign into supported websites, restart, check cookie persistence |
| Chrome account profile sync/avatar/password sync | **Not implemented** | Chrome Sync is not generally available to third-party browsers |
| Password manager, Chrome Lens, tab groups, casting | **Not implemented** | Requires separate secure designs and implementation |
| Signed installer, trusted Windows publisher | **Not implemented** | Obtain trusted signing certificate and sign EXE before public release |
| Secure browser auto-updates | **Not implemented** | Implement signed releases and verified update channel |
| Real Windows end-to-end regression suite | **Not completed** | Test on clean Windows 10/11 with fresh and upgrade installs |

## Engine decision

Use a maintained Chromium-based engine for the current Windows iteration. Electron 44.9.3 is pinned to reduce the risk of shipping an unsupported Chromium version. Electron does **not** expose the entire Google Chrome browser feature set. Achieving Chrome/Brave-level extension and browser-profile parity may require a maintained Chromium fork or a different full-browser architecture, a substantial separate engineering project.

No browser engine can guarantee zero security risk. Release requirements: current security updates, sandboxed untrusted pages, context isolation, no Node.js in website renderers, origin-checked IPC, safe external URL handling, permission prompts, dependency scanning, installer signing, verified auto-updates, and real Windows testing.

## Release rules

1. Never call the Windows browser 100% Android-equivalent until every Android feature has a passing Windows acceptance test or a documented, user-approved platform adaptation.
2. Never claim Chrome Sync or Chrome Web Store support because an account button or extension shortcut exists.
3. Never claim arbitrary video downloads are guaranteed. DRM, site access restrictions, and format compatibility remain limitations.
4. Never claim Windows SmartScreen / Unknown Publisher prompts are fixed by changing the installer theme.
5. Do not merge the feature branch to `main` until Windows installer CI and manual regression checks pass.

## Follow-up UI and sign-in notes

- Google G profile button opens a menu; Google-controlled WebAuthn/passkey challenges are not silently disabled. If Google allows an alternate password method, the user selects it on Google's page.
- Back navigation from Google authentication prioritizes the initiating website, or MH home for direct home-page sign-in.
- Settings use accessible expandable category groups, and About identifies MasoomDev and MH Developers.
- NSIS guided uninstallation shows confirmation/progress; complete native dark wizard styling and signed publisher identity remain outstanding.
