#!/usr/bin/env python3
"""Development only: JAVA_HOME and R8_JAR (Google R8 8.3.37); no Java needed by users."""
import hashlib, json, os, pathlib, subprocess, tempfile, zipfile
root = pathlib.Path(__file__).resolve().parent
java = pathlib.Path(os.environ['JAVA_HOME']) / 'bin'
r8 = pathlib.Path(os.environ['R8_JAR'])
# Pin the official Google Maven artifact; override is deliberately not supported.
expected = (root / 'r8.sha256').read_text().strip()
assert hashlib.sha256(r8.read_bytes()).hexdigest() == expected, 'R8 checksum mismatch'
with tempfile.TemporaryDirectory() as temp:
    temp = pathlib.Path(temp)
    subprocess.run([str(java/'javac'), '--release', '8', '-d', str(temp), str(root/'src/overlay/DisplayDump.java')], check=True)
    subprocess.run([str(java/'java'), '-cp', str(r8), 'com.android.tools.r8.D8', '--min-api', '30', '--output', str(temp), str(temp/'overlay/DisplayDump.class')], check=True)
    with zipfile.ZipFile(root/'display-dump.jar','w',zipfile.ZIP_DEFLATED) as z:
        info=zipfile.ZipInfo('classes.dex', (2020,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,(temp/'classes.dex').read_bytes())
(root/'manifest.json').write_text(json.dumps({'sourceSha256': hashlib.sha256((root/'src/overlay/DisplayDump.java').read_bytes()).hexdigest(), 'jarSha256': hashlib.sha256((root/'display-dump.jar').read_bytes()).hexdigest(), 'r8Version': '8.3.37', 'minAndroidApi': 30}, indent=2)+'\n')
print('Built', root/'display-dump.jar')
