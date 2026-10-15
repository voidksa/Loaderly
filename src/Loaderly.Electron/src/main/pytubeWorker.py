"""JSON-only adapter for the optional YouTube engine, invoked in a private venv."""
import json
import os
import re
import sys
import time
from pathlib import Path


def emit(value, progress=False):
    print(json.dumps(value, ensure_ascii=True), file=sys.stderr if progress else sys.stdout, flush=True)


def main(request):
    from pytubefix import YouTube
    url = request['url']
    started = time.monotonic()
    downloaded = 0
    total = 0
    completed = 0
    last = 0
    rate = max(0, min(1048576, int(request.get('rateKib') or 0))) * 1024

    def progress(stream, chunk, remaining):
        nonlocal downloaded, last
        downloaded = completed + stream.filesize - remaining
        elapsed = max(.01, time.monotonic() - started)
        if rate and downloaded / rate > elapsed:
            time.sleep(downloaded / rate - elapsed)
        now = time.monotonic()
        if now - last >= .2 or not remaining:
            last = now
            speed = downloaded / max(.01, now - started)
            emit(dict(phase='downloading', downloadedBytes=downloaded, totalBytes=total,
                      percent=min(100, downloaded / max(1, total) * 100), speedBytesPerSecond=speed,
                      etaSeconds=max(0, total - downloaded) / max(1, speed)), True)

    yt = YouTube(url, on_progress_callback=progress, use_oauth=False, allow_oauth_cache=False)
    metadata = dict(title=yt.title, id=yt.video_id)
    if request['action'] == 'metadata':
        return metadata
    quality = request.get('quality', 'best')
    streams = list(yt.streams)
    audio = [s for s in streams if s.type == 'audio']
    audio.sort(key=lambda s: (int(re.sub(r'\D', '', s.abr or '0') or 0), s.mime_type == 'audio/mp4'), reverse=True)
    selected = []
    if quality == 'audio':
        if not audio:
            raise ValueError('No audio stream is available for this video.')
        selected = [('audio', audio[0])]
    else:
        cap = 10000 if quality == 'best' else int(quality.rstrip('p'))
        video = [s for s in streams if s.type == 'video' and s.resolution and int(s.resolution.rstrip('p')) <= cap]
        video.sort(key=lambda s: (int(s.resolution.rstrip('p')), s.fps or 0, s.mime_type == 'video/mp4'), reverse=True)
        if not video:
            raise ValueError('The selected video quality is unavailable with the backup engine.')
        chosen = video[0]
        selected = [('video', chosen)]
        if not chosen.includes_audio_track:
            if not audio:
                raise ValueError('No audio stream is available for this video.')
            selected.append(('audio', audio[0]))
    output = Path(request['output'])
    total = sum(stream.filesize for _, stream in selected)
    result = {**metadata, 'streams': []}
    started = time.monotonic()
    for kind, stream in selected:
        # Private fixed filenames; a previous engine's partials are never reused.
        name = 'backup-source-' + kind + '.bin'
        path = stream.download(output_path=str(output), filename=name, skip_existing=False, timeout=30, max_retries=2)
        result['streams'].append({'kind': kind, 'path': path})
        completed += stream.filesize
    if request.get('writeSubtitles') and quality != 'audio':
        emit({'phase': 'subtitles'}, True)
        try:
            wanted = request.get('subtitleLanguages') or 'original,ar,en,-live_chat'
            codes = set(re.findall(r'\b(?:ar|en)\b', wanted))
            captions = list(yt.captions)
            matches = [c for c in captions if not codes or c.code.removeprefix('a.').split('-')[0] in codes]
            for caption in matches[:8]:
                code = re.sub(r'[^a-zA-Z0-9_.-]', '_', caption.code)[:30]
                path = output / ('backup-caption.' + code + '.srt')
                path.write_text(caption.generate_srt_captions(), encoding='utf-8')
                result.setdefault('captions', []).append(str(path))
            if not matches:
                result['captionWarning'] = True
        except Exception:
            result['captionWarning'] = True
    return result


if __name__ == '__main__':
    try:
        request = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
        emit({'ok': True, **main(request)})
    except Exception as error:
        emit({'ok': False, 'message': str(error)[:1200]})
        sys.exit(1)
