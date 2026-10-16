"""Local media inference. Reads a JSON request file; never uploads input media."""
import argparse
import json
import os
from pathlib import Path
import sys
import hashlib
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def progress(phase, **fields):
    print(json.dumps({"phase": phase, **fields}, ensure_ascii=False), file=sys.stderr, flush=True)


def analyze_speech_sample(source):
    """Choose a conservative VAD policy, not a genre or singer classifier."""
    import numpy as np
    import soundfile as sf
    from faster_whisper.vad import get_speech_timestamps, VadOptions
    audio, rate = sf.read(str(source), dtype='float32')
    if rate != 16000 or audio.ndim != 1 or len(audio) > 25 * rate:
        raise ValueError('INVALID_SPEECH_SAMPLE')
    frame = 320
    padded = np.pad(audio, (0, (-len(audio)) % frame))
    rms = np.sqrt(np.mean(padded.reshape(-1, frame) ** 2, axis=1))
    active = rms > max(0.0005, float(np.max(rms, initial=0)) * 0.025)
    duration = len(audio) / rate
    if not np.any(active):
        return {'mode': 'speech', 'reason': 'quiet', 'sampledSeconds': duration}
    spans = get_speech_timestamps(audio, VadOptions(min_silence_duration_ms=250, speech_pad_ms=0))
    voices = np.zeros(len(active), dtype=bool)
    for span in spans:
        voices[span['start'] // frame:(span['end'] + frame - 1) // frame] = True
    coverage = float(np.count_nonzero(active & voices) / np.count_nonzero(active))
    # Uncertain / continuous non-speech sound uses full-audio recognition so
    # the speech detector cannot silently discard singing or processed vocals.
    mode = 'speech' if coverage >= 0.85 else 'music'
    return {'mode': mode, 'reason': 'speech' if mode == 'speech' else 'mixed', 'sampledSeconds': duration}


def verified_speech(cache, model, download=False, repaired=False):
    from huggingface_hub import snapshot_download
    spec = json.loads(Path(__file__).with_name('models.json').read_text())[model]
    directory = Path(snapshot_download(spec['repository'], revision=spec['revision'],
                     cache_dir=str(cache / 'speech'), allow_patterns=list(spec['files']), local_files_only=not download))
    for name, expected in spec['files'].items():
        path = directory / name
        digest = hashlib.sha256() if expected['algorithm'] == 'sha256' else hashlib.sha1()
        if expected['algorithm'] == 'git-sha1':
            digest.update(f"blob {expected['size']}\0".encode())
        with path.open('rb') as file:
            for block in iter(lambda: file.read(1024 * 1024), b''):
                digest.update(block)
        if path.stat().st_size != expected['size'] or digest.hexdigest() != expected['hash']:
            if download and not repaired:
                snapshot_download(spec['repository'], revision=spec['revision'], cache_dir=str(cache / 'speech'), allow_patterns=list(spec['files']), force_download=True)
                return verified_speech(cache, model, True, True)
            raise ValueError('MODEL_INTEGRITY_FAILED')
    return directory


def verified_separation(cache, download=False, repaired=False):
    spec = json.loads(Path(__file__).with_name('models.json').read_text())['separation']
    folder = cache / 'torch' / 'hub' / 'checkpoints'
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / spec['file']
    if not target.exists() and download:
        temporary = target.with_suffix('.partial')
        try:
            with urllib.request.urlopen(spec['url'], timeout=60) as response, temporary.open('wb') as file:
                total = int(response.headers.get('Content-Length', 0)); received = 0
                while block := response.read(1024 * 1024):
                    received += len(block)
                    if received > 200 * 1024 * 1024:
                        raise ValueError('MODEL_TOO_LARGE')
                    file.write(block)
                    progress('downloading', seconds=received, duration=total)
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
    digest = hashlib.sha256()
    with target.open('rb') as file:
        for block in iter(lambda: file.read(1024 * 1024), b''):
            digest.update(block)
    if digest.hexdigest() != spec['sha256']:
        if download and not repaired:
            target.unlink()
            return verified_separation(cache, True, True)
        raise ValueError('MODEL_INTEGRITY_FAILED')
    return folder


def run(request):
    cache = Path(request["cache"]).resolve()
    cache.mkdir(parents=True, exist_ok=True)
    os.environ["HF_HOME"] = str(cache / "huggingface")
    os.environ["TORCH_HOME"] = str(cache / "torch")
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    os.environ["DO_NOT_TRACK"] = "1"
    action = request["action"]
    engine = request.get("engine", "speech")
    model = request.get("model", "base")
    if model not in ("base", "small"):
        raise ValueError("Unsupported speech model")
    if action == "prepare":
        progress("downloading", engine=engine)
        if engine == "speech":
            from faster_whisper import WhisperModel
            WhisperModel(str(verified_speech(cache, model, True)), device="cpu", compute_type="int8")
        elif engine == "separation":
            from demucs.pretrained import get_model
            get_model("955717e8", repo=verified_separation(cache, True))
        else:
            raise ValueError("Unsupported engine")
        return {"ok": True, "engine": engine, "model": model}
    source = Path(request["source"]).resolve(strict=True)
    if action == 'analyze-speech':
        return {'ok': True, 'analysis': analyze_speech_sample(source)}
    output = Path(request["output"]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    if action == "transcribe":
        os.environ["HF_HUB_OFFLINE"] = "1"
        from faster_whisper import WhisperModel
        engine = WhisperModel(str(verified_speech(cache, model)), device="cpu", compute_type="int8", cpu_threads=min(8, os.cpu_count() or 2), local_files_only=True)
        language = request.get("language", "auto")
        speech_mode = request.get("speechMode", "speech")
        if speech_mode not in ("speech", "music"):
            raise ValueError("INVALID_SPEECH_MODE")
        # Spoken-voice detection can discard singing and heavily processed vocals.
        # Keep it for speech/silence; music mode explicitly analyzes the full audio.
        segments, info = engine.transcribe(str(source), language=None if language == "auto" else language, word_timestamps=True, vad_filter=speech_mode == "speech", beam_size=5)
        cues, words = [], []
        for segment in segments:
            cues.append({"startSeconds": segment.start, "endSeconds": segment.end, "text": segment.text.strip()})
            words.extend({"start": w.start, "end": w.end, "text": w.word, "probability": w.probability} for w in segment.words or [])
            progress("transcribing", seconds=segment.end, duration=info.duration)
        if not cues and speech_mode == 'speech' and request.get('automatic'):
            # Automatic selection is only a recommendation. Retry without the
            # voice filter when it missed all words; explicit settings stay exact.
            segments, info = engine.transcribe(str(source), language=None if language == 'auto' else language, word_timestamps=True, vad_filter=False, beam_size=5)
            for segment in segments:
                cues.append({'startSeconds': segment.start, 'endSeconds': segment.end, 'text': segment.text.strip()})
                words.extend({'start': w.start, 'end': w.end, 'text': w.word, 'probability': w.probability} for w in segment.words or [])
                progress('transcribing', seconds=segment.end, duration=info.duration)
        result = {"language": info.language, "cues": cues, "words": words}
        target = output / "transcript.json"
        target.with_suffix('.partial').write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
        target.with_suffix('.partial').replace(target)
        return {"ok": True, "paths": [str(target)]}
    if action == "separate":
        import numpy as np
        import soundfile as sf
        import torch
        from demucs.apply import apply_model
        from demucs.pretrained import get_model
        # The caller prepares stereo 44.1 kHz PCM using Loaderly's FFmpeg.
        info = sf.info(str(source)); sample_rate = info.samplerate
        if sample_rate != 44100 or info.channels != 2:
            raise ValueError("Separation requires stereo 44100 Hz PCM")
        torch.set_num_threads(min(8, os.cpu_count() or 2))
        model = get_model("955717e8", repo=verified_separation(cache))
        model.cpu().eval()
        # Fixed-size chunks and overlap keep memory bounded for long recordings.
        overlap = 2 * sample_rate; chunk = 30 * sample_rate; hop = chunk - overlap
        names = ['vocals', 'instrumental']; temporary = [output / f'{name}.partial' for name in names]
        try:
            with sf.SoundFile(str(source)) as input_file, sf.SoundFile(str(temporary[0]), 'w', samplerate=sample_rate, channels=2, format='RF64', subtype='FLOAT') as vocal_file, sf.SoundFile(str(temporary[1]), 'w', samplerate=sample_rate, channels=2, format='RF64', subtype='FLOAT') as music_file:
                position = 0; tail = None
                while position < info.frames:
                    input_file.seek(position); audio = input_file.read(chunk, dtype='float32', always_2d=True)
                    wave = torch.from_numpy(audio.T.copy()); mean = wave.mean(); std = wave.std()
                    if not torch.isfinite(std) or std < 1e-8:
                        vocals = np.zeros_like(audio)
                    else:
                        with torch.inference_mode():
                            sources = apply_model(model, ((wave - mean) / std)[None], device='cpu', shifts=0, split=True, overlap=.25, progress=False, num_workers=0)[0]
                        vocals = (sources[model.sources.index('vocals')] * std + mean).T.numpy()
                    if tail is not None:
                        length = min(len(tail), len(vocals)); blend = np.linspace(0, 1, length, dtype='float32')[:, None]
                        vocals[:length] = tail[:length] * (1 - blend) + vocals[:length] * blend
                    last = position + len(audio) >= info.frames; count = len(audio) if last else hop
                    vocal_file.write(vocals[:count]); music_file.write(audio[:count] - vocals[:count])
                    tail = vocals[count:].copy(); position += count
                    progress('separating', seconds=position, duration=info.frames)
                    if last: break
            paths = []
            for name, temporary_path in zip(names, temporary):
                target = output / f'{name}.wav'; temporary_path.replace(target); paths.append(str(target))
            return {'ok': True, 'paths': paths, 'sampleRate': sample_rate, 'frames': info.frames}
        finally:
            for path in temporary: path.unlink(missing_ok=True)
    raise ValueError("Unsupported local task")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--request", required=True)
    args = parser.parse_args()
    try:
        request = json.loads(Path(args.request).read_text(encoding="utf-8-sig"))
        print(json.dumps(run(request), ensure_ascii=False), flush=True)
    except Exception as error:
        print(json.dumps({"ok": False, "message": str(error)}, ensure_ascii=False), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
