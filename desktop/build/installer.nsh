; MH Browser / MasoomDev — NSIS Modern UI branding.
; Native Windows security prompts cannot be restyled or suppressed.
!ifndef MUI_BGCOLOR
  !define MUI_BGCOLOR "071326"
!endif
!ifndef MUI_TEXTCOLOR
  !define MUI_TEXTCOLOR "FFFFFF"
!endif
!ifndef MUI_INSTFILESPAGE_COLORS
  !define MUI_INSTFILESPAGE_COLORS "FFFFFF 071326"
!endif

; Keep installation per-user and remove the confusing install-mode radio page.
; Existing user sessions remain intact on ordinary in-place updates.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to MH Browser"
  !define MUI_WELCOMEPAGE_TEXT "MH Browser by MasoomDev.$\r$\n$\r$\nYour browser, your style.$\r$\n$\r$\nChoose Next to begin installation."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_UNWELCOMEPAGE_TITLE "Uninstall MH Browser"
  !define MUI_UNWELCOMEPAGE_TEXT "MH Browser by MasoomDev.$\r$\n$\r$\nUninstalling removes the browser and its local profile, including saved sign-ins, history, cookies, and settings. Downloaded files outside the app profile are not removed.$\r$\n$\r$\nChoose Next to continue."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

!macro customHeader
  BrandingText "MH Browser  |  MasoomDev"
!macroend
