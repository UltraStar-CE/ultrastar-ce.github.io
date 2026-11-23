"""Export a static, metadata-free public gallery from a USCE screenshot manifest."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from shutil import copy2

from PIL import Image


PAGE = Path(__file__).resolve().parent.parent / 'docs' / 'themes'
# The duplicate-song dialog can show local paths. Generic audit popups show review copy.
OMITTED_SCENES = {'song-duplicate', 'popup-error', 'popup-info'}


def screenshot(root, relpath):
    path = (root / relpath).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError(f'Invalid screenshot path: {relpath}')
    return path


def encode(source):
    original = source.read_bytes()
    with Image.open(BytesIO(original)) as frame:
        frame = frame.convert('RGB')
        frame.thumbnail((1280, 1280), Image.Resampling.LANCZOS, reducing_gap=3)
        encoded = BytesIO()
        frame.save(encoded, format='WEBP', quality=70, method=3)
        return encoded.getvalue(), frame.size


def gallery_capture(source, image_dir):
    encoded, (width, height) = encode(source)
    name = f'{sha256(encoded).hexdigest()[:24]}.webp'
    destination = image_dir / name
    # Identical exports can share an asset across screens and comparison views.
    try:
        with destination.open('xb') as file:
            file.write(encoded)
    except FileExistsError:
        pass
    return dict(src=f'images/{name}', width=width, height=height)


def build_row(case, root, image_dir):
    after = screenshot(root, case['after'])
    before = screenshot(root, Path(case['path']) / 'screen.jpg') if case.get('captured') else None
    row = {key: case[key] for key in ('theme', 'screen', 'language', 'resolution')}
    row['latest'] = dict(
        **gallery_capture(after, image_dir),
        skin=case.get('afterSkin') or case['skin'],
    )
    if before:
        row['earlier'] = dict(**gallery_capture(before, image_dir), skin=case['skin'])
    return row


def export_gallery(root, target, workers, prune):
    manifest = json.loads((root / 'capture-manifest.json').read_text(encoding='utf-8-sig'))
    cases = [case for case in manifest['cases']
             if case['screen'] not in OMITTED_SCENES and case.get('after')]
    target.mkdir(parents=True, exist_ok=True)
    image_dir = target / 'images'
    image_dir.mkdir(exist_ok=True)
    for name in ('index.html', 'gallery.css', 'gallery.js'):
        source = PAGE / name
        destination = target / name
        if source != destination:
            copy2(source, destination)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        rows = list(pool.map(lambda case: build_row(case, root, image_dir), cases))
    scenes = list(dict.fromkeys(row['screen'] for row in rows))
    titles = {scene: manifest['titles'].get(scene, scene.replace('-', ' ').capitalize())
              for scene in scenes}
    (target / 'gallery-data.js').write_text(
        'window.USCE_THEME_GALLERY = '
        + json.dumps(dict(screens=titles, screenshots=rows), ensure_ascii=False, separators=(',', ':'))
        + ';\n', encoding='utf-8', newline='\n',
    )
    assets = {row[key]['src'] for row in rows for key in ('latest', 'earlier') if key in row}
    if prune:
        for old in image_dir.glob('*.webp'):
            if old.relative_to(target).as_posix() not in assets and len(old.stem) == 24 \
                    and all(ch in '0123456789abcdef' for ch in old.stem):
                old.unlink()
    size = sum((target / asset).stat().st_size for asset in assets)
    print(f'{len(rows)} entries, {len(assets)} unique images, {size / 1024**2:.1f} MiB')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('gallery_root', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--workers', type=int, default=6)
    parser.add_argument('--prune', action='store_true', help='Remove outdated generated WebP files')
    args = parser.parse_args()
    export_gallery(args.gallery_root.resolve(), args.output.resolve(), args.workers, args.prune)
