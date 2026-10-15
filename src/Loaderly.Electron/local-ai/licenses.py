"""Collect the installed runtime's redistribution notices, without environment paths."""
import importlib.metadata
import json
import pathlib
import re
import sys

target = pathlib.Path(sys.argv[1])
target.mkdir(parents=True, exist_ok=True)
manifest = []
for distribution in importlib.metadata.distributions():
    name = distribution.metadata.get('Name', 'unknown')
    safe = re.sub(r'[^a-zA-Z0-9._-]', '_', name)
    files = []
    for file in distribution.files or []:
        if re.search(r'(^|/)(licenses?|copying|notice)([./_-]|$)', str(file), re.I):
            source = pathlib.Path(distribution.locate_file(file))
            if source.is_file() and source.stat().st_size < 4 * 1024 * 1024:
                dest = target / safe / re.sub(r'[^a-zA-Z0-9._-]', '_', str(file))
                dest.parent.mkdir(exist_ok=True)
                dest.write_bytes(source.read_bytes())
                files.append(str(dest.relative_to(target)).replace('\\', '/'))
    manifest.append({'name': name, 'version': distribution.version,
                     'license': distribution.metadata.get('License-Expression') or distribution.metadata.get('License', ''),
                     'files': files})
(target / 'components.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
