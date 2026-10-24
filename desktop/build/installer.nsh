; MH Browser / MasoomDev — NSIS Modern UI branding.
; Native Windows security prompts cannot be restyled or suppressed.
; Override Electron Builder defaults before the MUI pages are constructed.
; In particular the Finish page checkbox must be WHITE on the navy panel.
!ifdef MUI_BGCOLOR
  !undef MUI_BGCOLOR
!endif
!define MUI_BGCOLOR "071326"
!ifdef MUI_TEXTCOLOR
  !undef MUI_TEXTCOLOR
!endif
!define MUI_TEXTCOLOR "FFFFFF"
!ifdef MUI_INSTFILESPAGE_COLORS
  !undef MUI_INSTFILESPAGE_COLORS
!endif
!define MUI_INSTFILESPAGE_COLORS "FFFFFF 071326"

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

; A truly new installation must not inherit orphaned cookies and restored tabs
; from an OLD uninstaller that left userData behind. Updates are never wiped.
!macro customInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$APPDATA\\mh-browser-windows"
    RMDir /r "$APPDATA\\MH Browser"
  ${endif}
!macroend

!macro customHeader
  BrandingText "MH Browser  |  MasoomDev"
!macroend

; Keep the normal electron-builder launch behavior, but give the finish page
; an explicit, high-contrast MH style rather than a dark-on-dark checkbox.
!macro customFinishPage
  Function MhLaunchAfterFinish
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd
  !define MUI_FINISHPAGE_TITLE "MH Browser is ready"
  !define MUI_FINISHPAGE_TEXT "Installation completed successfully.$\r$\n$\r$\nClick Finish to close Setup."
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_TEXT "Run MH Browser"
  !define MUI_FINISHPAGE_RUN_FUNCTION "MhLaunchAfterFinish"
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW MhFinishShow
  !insertmacro MUI_PAGE_FINISH
!macroend

!ifndef BUILD_UNINSTALLER
Function MhFinishShow
  ; The Finish page is an nsDialogs child of the installer window.
  ; Resolve controls at runtime: electron-builder compiles its uninstaller
  ; before the MUI2 Finish-page variables exist.
  FindWindow $0 "#32770" "" $HWNDPARENT
  FindWindow $1 "Button" "Run MH Browser" $0
  StrCmp $1 0 mh_finish_done
  SetCtlColors $1 "FFFFFF" "071326"
  System::Call 'UXTHEME::SetWindowTheme(p$1,w" ",w" ")'
mh_finish_done:
FunctionEnd
!endif
