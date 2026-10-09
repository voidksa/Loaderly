# Local face detector

pico.js: https://github.com/nenadmarkus/picojs at afffa50ec4134a47005f2cbf8112eaa69f65f37e (MIT).
Local changes: declare the pico object, export as ESM, omit the unused detection-memory helper.

facefinder.json: base64 of rnt/cascades/facefinder from https://github.com/nenadmarkus/pico at
7d550c78b2c31a4e1dfc5bcdfe9da013297b5cc8 (MIT; see PICO-LICENSE.txt).
Decoded SHA-256: d8014993e7298c7b1865d1f8b855d6dbf4ec5c808bf879e2091ab6837abf90cd.

Reference: N. Markus, M. Frljak, I. S. Pandzic, J. Ahlberg and R. Forchheimer,
Object Detection with Pixel Intensity Comparisons Organized in Decision Trees, https://arxiv.org/abs/1305.4537.

This is a frontal-face detector, not an identity recognizer. Tiny, occluded or profile faces
can be missed. Area tracking remains available for targets a face detector cannot find.
