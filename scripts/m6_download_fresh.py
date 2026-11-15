#!/usr/bin/env python3
"""Run the M6 LAADS download with the newest token pasted in this session.

The token is extracted programmatically from the session transcript, so
it is never retyped (retyping corrupted it once already, 401ing all 154
files). It lives only in process memory and is never printed. Usage:
    .venv/Scripts/python.exe scripts/m6_download_fresh.py <session.jsonl>
"""

import base64
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
JWT = re.compile(r'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}')

log = Path(sys.argv[1]).read_text(encoding='utf-8')
toks = JWT.findall(log)
if not toks:
    print('FATAL: no token found in transcript')
    sys.exit(1)
tok = toks[-1]
payload = json.loads(base64.urlsafe_b64decode(
    tok.split('.')[1] + '=' * (-len(tok.split('.')[1]) % 4)))
print('newest pasted token: iat=%s exp=%s uid=%s'
      % (payload.get('iat'), payload.get('exp'), payload.get('uid')))
if payload.get('iat') != 1794703223:
    print('FATAL: transcript has no fresh paste yet (stale log); aborting.')
    sys.exit(3)
os.environ['EARTHDATA_TOKEN'] = tok
import download_laads
sys.exit(download_laads.main())