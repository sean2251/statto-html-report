#!/usr/bin/env python3
"""Start the Statto Reports app from source: `python3 statto_app.py`.

(The packaged Mac app runs exactly this.) See the README's "The Statto Reports
app" section.
"""

import sys

from statto_app.__main__ import main

if __name__ == "__main__":
    sys.exit(main())
