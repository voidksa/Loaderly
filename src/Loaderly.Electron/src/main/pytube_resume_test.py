"""Real HTTP range tests for the backup worker, without a YouTube/account dependency."""
import hashlib
import importlib.util
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

spec = importlib.util.spec_from_file_location('worker', Path(__file__).with_name('pytubeWorker.py'))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class ResumeTest(unittest.TestCase):
    def setUp(self):
        self.data = bytes(range(256)) * 20000
        self.ranges = []
        self.ignore = False
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                first, last = map(int, self.headers['Range'][6:].split('-'))
                owner.ranges.append((first, last))
                data = owner.data if owner.ignore else owner.data[first:last+1]
                self.send_response(200 if owner.ignore else 206)
                self.send_header('Content-Length', str(len(data)))
                if not owner.ignore:
                    self.send_header('Content-Range', f'bytes {first}-{last}/{len(owner.data)}')
                self.end_headers()
                try:
                    self.wfile.write(data)
                except (ConnectionError, OSError):
                    pass
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}/audio'
        self.folder = tempfile.TemporaryDirectory(prefix='loaderly-resume-')
        self.path = Path(self.folder.name) / 'backup-source-audio.bin'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.folder.cleanup()

    def download(self, progress=lambda *_: None, identity='same'):
        return worker.download_resumable(self.url, self.path, len(self.data), identity, progress)

    def pause(self, chunk, remaining):
        if chunk:
            raise InterruptedError('pause')

    def test_pause_resume_transfers_only_remaining_bytes_and_reuses_complete_stream(self):
        with self.assertRaises(InterruptedError):
            self.download(self.pause)
        saved = self.path.stat().st_size
        self.assertEqual(saved, 1024*1024)
        self.ranges.clear()
        self.download()
        self.assertEqual(self.ranges[0], (0, 65535))  # small identity probe
        self.assertEqual(self.ranges[1][0], saved)
        self.assertEqual(hashlib.sha256(self.path.read_bytes()).digest(), hashlib.sha256(self.data).digest())
        self.ranges.clear()
        self.download()
        self.assertEqual(self.ranges, [(0, 65535)])

    def test_does_not_append_if_source_ignores_ranges(self):
        with self.assertRaises(InterruptedError):
            self.download(self.pause)
        saved = self.path.read_bytes()
        self.ignore = True
        with self.assertRaises(ValueError):
            self.download()
        self.assertEqual(self.path.read_bytes(), saved)

    def test_changed_stream_restarts_cleanly_instead_of_mixing_content(self):
        with self.assertRaises(InterruptedError):
            self.download(self.pause)
        self.data = b'Z' * len(self.data)
        self.download()
        self.assertEqual(self.path.read_bytes(), self.data)


if __name__ == '__main__':
    unittest.main()
