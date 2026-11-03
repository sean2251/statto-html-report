# PyInstaller spec for the Statto Reports app.
#
#   pip install pyinstaller
#   pyinstaller packaging/statto_reports.spec
#
# macOS  -> dist/Statto Reports.app   (built in CI: .github/workflows/build-mac-app.yml)
# other  -> dist/Statto Reports/      (a folder with the executable; the same
#           spec is the starting point for a future Windows build)
#
# The app is a small local web server plus the browser, so it has no window of
# its own. On macOS it's marked LSUIElement (no Dock icon / menu bar): double-
# clicking it opens the home page in the browser, double-clicking again while
# it runs just reopens that page, and the home page's Quit button stops it.

import os
import re
import sys

ROOT = os.path.abspath(os.path.join(SPECPATH, ".."))

with open(os.path.join(ROOT, "statto_app", "__init__.py"), encoding="utf-8") as f:
    VERSION = re.search(r'__version__\s*=\s*"([^"]+)"', f.read()).group(1)

APP_NAME = "Statto Reports"
ICON = os.path.join(ROOT, "packaging", "icon.icns") if sys.platform == "darwin" else os.path.join(ROOT, "packaging", "icon.ico")
ICON = ICON if os.path.exists(ICON) else None

a = Analysis(
    [os.path.join(ROOT, "statto_app.py")],
    pathex=[ROOT],
    datas=[
        (os.path.join(ROOT, "statto_report", "templates"), "statto_report/templates"),
        (os.path.join(ROOT, "statto_app", "static"), "statto_app/static"),
    ],
    hiddenimports=[],
    excludes=["tkinter", "unittest", "pydoc_data"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=APP_NAME,
    console=False,          # no terminal window
    icon=ICON,
    argv_emulation=False,
)
coll = COLLECT(exe, a.binaries, a.datas, name=APP_NAME)

if sys.platform == "darwin":
    app = BUNDLE(
        coll,
        name=APP_NAME + ".app",
        icon=ICON,
        bundle_identifier="io.github.sean2251.statto-reports",
        version=VERSION,
        info_plist={
            "CFBundleName": APP_NAME,
            "CFBundleDisplayName": APP_NAME,
            "CFBundleShortVersionString": VERSION,
            "CFBundleVersion": VERSION,
            "LSUIElement": True,
            "LSMinimumSystemVersion": "11.0",
            "NSHumanReadableCopyright": "Statto Reports",
        },
    )
