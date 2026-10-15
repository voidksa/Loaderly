from PyInstaller.utils.hooks import collect_all, copy_metadata

datas, binaries, hiddenimports = [(str(SPECPATH) + '/models.json', '.')], [], []
for package in ['faster_whisper', 'ctranslate2', 'tokenizers', 'av', 'onnxruntime', 'demucs', 'dora', 'julius', 'torchaudio', 'soundfile']:
    package_datas, package_binaries, package_imports = collect_all(package)
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_imports
for distribution in ['demucs', 'dora-search', 'faster-whisper', 'huggingface-hub']:
    datas += copy_metadata(distribution)

a = Analysis([str(SPECPATH) + '/worker.py'], pathex=[], binaries=binaries, datas=datas,
             hiddenimports=hiddenimports, hookspath=[], hooksconfig={}, runtime_hooks=[],
             excludes=['tkinter', 'matplotlib', 'IPython', 'pytest', 'tensorboard'])
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name='loaderly-ai', debug=False,
          bootloader_ignore_signals=False, strip=False, upx=False, console=True)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name='loaderly-ai')
