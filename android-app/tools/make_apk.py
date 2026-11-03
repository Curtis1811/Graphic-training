#!/usr/bin/env python3
"""Package an unsigned APK without the Android SDK.

Writes the binary AndroidManifest.xml and resources.arsc directly (the formats
aapt2 normally produces), then zips them with classes.dex, the launcher icon
and the web app (as assets/www/). Stored entries are 4-byte aligned, which
Android 11+ requires for resources.arsc.

usage: make_apk.py <web_dir> <classes.dex> <icon.png> <out.apk>
"""
import os
import struct
import sys
import zipfile

PACKAGE = 'com.gltrainer.app'
VERSION_CODE = 1
VERSION_NAME = '1.0'
MIN_SDK = 24
TARGET_SDK = 34
LABEL = 'GL Trainer'
ICON_PATH = 'res/mipmap/ic_launcher.png'
ICON_RES_ID = 0x7F010000                       # package 0x7f, type 1 (mipmap), entry 0
THEME_MATERIAL_NO_ACTION_BAR = 0x0103022E       # @android:style/Theme.Material.NoActionBar

ANDROID_NS = 'http://schemas.android.com/apk/res/android'
# Public framework attribute IDs (frameworks/base/core/res/res/values/public.xml)
ATTR_IDS = {
    'theme': 0x01010000, 'label': 0x01010001, 'icon': 0x01010002, 'name': 0x01010003,
    'exported': 0x01010010, 'configChanges': 0x0101001F, 'minSdkVersion': 0x0101020C,
    'versionCode': 0x0101021B, 'versionName': 0x0101021C, 'windowSoftInputMode': 0x0101022B,
    'targetSdkVersion': 0x01010270, 'allowBackup': 0x01010280, 'hardwareAccelerated': 0x010102D3,
}

# Res_value data types
TYPE_REFERENCE, TYPE_STRING, TYPE_INT_DEC, TYPE_INT_HEX, TYPE_INT_BOOLEAN = 0x01, 0x03, 0x10, 0x11, 0x12
NO_INDEX = 0xFFFFFFFF


# ----------------------------------------------------------------------------- string pools
def _len8(n):
    return bytes([n]) if n < 0x80 else bytes([(n >> 8) | 0x80, n & 0xFF])


def _len16(n):
    return struct.pack('<H', n) if n < 0x8000 else struct.pack('<HH', (n >> 16) | 0x8000, n & 0xFFFF)


def string_pool(strings, utf8):
    data, offsets = b'', []
    for s in strings:
        offsets.append(len(data))
        if utf8:
            b = s.encode('utf-8')
            data += _len8(len(s)) + _len8(len(b)) + b + b'\0'
        else:
            u = s.encode('utf-16-le')
            data += _len16(len(u) // 2) + u + b'\0\0'
    data += b'\0' * (-len(data) % 4)
    strings_start = 28 + 4 * len(strings)
    header = struct.pack('<HHIIIIII', 0x0001, 28, strings_start + len(data), len(strings), 0,
                         0x100 if utf8 else 0, strings_start, 0)
    return header + b''.join(struct.pack('<I', o) for o in offsets) + data


# ----------------------------------------------------------------------------- resources.arsc
def make_arsc():
    types = [('mipmap', [('ic_launcher', ICON_PATH)])]
    values = [path for _, entries in types for _, path in entries]
    keys = [key for _, entries in types for key, _ in entries]
    global_pool = string_pool(values, utf8=True)
    type_pool = string_pool([t for t, _ in types], utf8=True)
    key_pool = string_pool(keys, utf8=True)

    body = b''
    for type_id, (_, entries) in enumerate(types, start=1):
        n = len(entries)
        body += struct.pack('<HHIBBHI', 0x0202, 16, 16 + 4 * n, type_id, 0, 1, n) + b'\0\0\0\0' * n  # typesCount = 1
        config = struct.pack('<I', 64) + b'\0' * 60          # default configuration
        header_size = 20 + len(config)
        entries_start = header_size + 4 * n
        offsets, entry_data = b'', b''
        for key, path in entries:
            offsets += struct.pack('<I', len(entry_data))
            entry_data += struct.pack('<HHI', 8, 0, keys.index(key))
            entry_data += struct.pack('<HBBI', 8, 0, TYPE_STRING, values.index(path))
        body += struct.pack('<HHIBBHII', 0x0201, header_size, entries_start + len(entry_data),
                            type_id, 0, 0, n, entries_start) + config + offsets + entry_data

    name = PACKAGE.encode('utf-16-le').ljust(256, b'\0')
    pkg_header_size = 288
    pkg_size = pkg_header_size + len(type_pool) + len(key_pool) + len(body)
    package = struct.pack('<HHII', 0x0200, pkg_header_size, pkg_size, 0x7F) + name + struct.pack(
        '<IIIII', pkg_header_size, len(types), pkg_header_size + len(type_pool), len(keys), 0)
    package += type_pool + key_pool + body
    return struct.pack('<HHII', 0x0002, 12, 12 + len(global_pool) + len(package), 1) + global_pool + package


# ----------------------------------------------------------------------------- AndroidManifest.xml
def attr(name, value, kind, ns=ANDROID_NS):
    return (name, ns, kind, value)


def manifest_tree():
    config_changes = 0x80 | 0x100 | 0x200 | 0x400 | 0x800 | 0x20 | 0x10  # rotation, resize, keyboard, uiMode
    return ('manifest', [
        attr('versionCode', VERSION_CODE, 'int'),
        attr('versionName', VERSION_NAME, 'str'),
        attr('package', PACKAGE, 'str', ns=None),
    ], [
        ('uses-sdk', [attr('minSdkVersion', MIN_SDK, 'int'), attr('targetSdkVersion', TARGET_SDK, 'int')], []),
        # Not used for any network traffic (everything is served from assets), but some
        # WebView versions refuse to load even intercepted https:// pages without it.
        ('uses-permission', [attr('name', 'android.permission.INTERNET', 'str')], []),
        ('application', [
            attr('theme', THEME_MATERIAL_NO_ACTION_BAR, 'ref'),
            attr('label', LABEL, 'str'),
            attr('icon', ICON_RES_ID, 'ref'),
            attr('allowBackup', True, 'bool'),
            attr('hardwareAccelerated', True, 'bool'),
        ], [
            ('activity', [
                attr('name', PACKAGE + '.MainActivity', 'str'),
                attr('exported', True, 'bool'),
                attr('configChanges', config_changes, 'hex'),
                attr('windowSoftInputMode', 0x10, 'hex'),  # adjustResize
            ], [
                ('intent-filter', [], [
                    ('action', [attr('name', 'android.intent.action.MAIN', 'str')], []),
                    ('category', [attr('name', 'android.intent.category.LAUNCHER', 'str')], []),
                ]),
            ]),
        ]),
    ])


def make_axml(tree):
    # Attribute names that have resource IDs must come first in the string pool,
    # in the same order as the resource map.
    res_names, others = [], []

    def collect(node):
        tag, attrs, children = node
        for name, ns, kind, value in attrs:
            if ns == ANDROID_NS:
                if name not in res_names:
                    res_names.append(name)
            elif name not in others:
                others.append(name)
            if kind == 'str' and value not in others:
                others.append(value)
        if tag not in others:
            others.append(tag)
        for c in children:
            collect(c)

    collect(tree)
    for s in ('android', ANDROID_NS):
        if s not in others:
            others.append(s)
    strings = res_names + [s for s in others if s not in res_names]
    idx = strings.index

    chunks = []
    chunks.append(struct.pack('<HHIIIII', 0x0100, 16, 24, 1, NO_INDEX, idx('android'), idx(ANDROID_NS)))

    def emit(node, line=[1]):
        tag, attrs, children = node
        line[0] += 1
        # Android expects attributes sorted by resource ID (unnamespaced ones last).
        attrs = sorted(attrs, key=lambda a: ATTR_IDS.get(a[0], 0x7FFFFFFF) if a[1] == ANDROID_NS else 0x7FFFFFFF)
        attr_bytes = b''
        for name, ns, kind, value in attrs:
            ns_i = idx(ns) if ns else NO_INDEX
            if kind == 'str':
                raw, dtype, data = idx(value), TYPE_STRING, idx(value)
            elif kind == 'int':
                raw, dtype, data = NO_INDEX, TYPE_INT_DEC, value
            elif kind == 'hex':
                raw, dtype, data = NO_INDEX, TYPE_INT_HEX, value
            elif kind == 'bool':
                raw, dtype, data = NO_INDEX, TYPE_INT_BOOLEAN, 0xFFFFFFFF if value else 0
            elif kind == 'ref':
                raw, dtype, data = NO_INDEX, TYPE_REFERENCE, value
            else:
                raise ValueError(kind)
            attr_bytes += struct.pack('<IIIHBBI', ns_i, idx(name), raw, 8, 0, dtype, data)
        size = 16 + 20 + len(attr_bytes)
        chunks.append(struct.pack('<HHIII', 0x0102, 16, size, line[0], NO_INDEX)
                      + struct.pack('<IIHHHHHH', NO_INDEX, idx(tag), 20, 20, len(attrs), 0, 0, 0)
                      + attr_bytes)
        for c in children:
            emit(c)
        line[0] += 1
        chunks.append(struct.pack('<HHIIIII', 0x0103, 16, 24, line[0], NO_INDEX, NO_INDEX, idx(tag)))

    emit(tree)
    chunks.append(struct.pack('<HHIIIII', 0x0101, 16, 24, 99, NO_INDEX, idx('android'), idx(ANDROID_NS)))

    pool = string_pool(strings, utf8=False)
    res_map = struct.pack('<HHI', 0x0180, 8, 8 + 4 * len(res_names)) + b''.join(
        struct.pack('<I', ATTR_IDS[n]) for n in res_names)
    body = pool + res_map + b''.join(chunks)
    return struct.pack('<HHI', 0x0003, 8, 8 + len(body)) + body


# ----------------------------------------------------------------------------- zip
def write_aligned(zf, name, data, compress):
    info = zipfile.ZipInfo(name, date_time=(2024, 1, 1, 0, 0, 0))
    info.external_attr = 0o644 << 16
    if compress:
        info.compress_type = zipfile.ZIP_DEFLATED
    else:
        info.compress_type = zipfile.ZIP_STORED
        # Pad the local header's extra field so the file data starts on a 4-byte boundary.
        offset = zf.fp.tell() + 30 + len(name.encode())
        pad = (-(offset + 6)) % 4   # 6 = extra-field header (4) + alignment value (2)
        info.extra = struct.pack('<HH', 0xD935, pad + 2) + struct.pack('<H', 4) + b'\0' * pad
    zf.writestr(info, data)


def main(web_dir, dex_path, icon_path, out_path):
    with zipfile.ZipFile(out_path, 'w') as zf:
        write_aligned(zf, 'AndroidManifest.xml', make_axml(manifest_tree()), True)
        write_aligned(zf, 'resources.arsc', make_arsc(), False)
        write_aligned(zf, 'classes.dex', open(dex_path, 'rb').read(), True)
        write_aligned(zf, ICON_PATH, open(icon_path, 'rb').read(), False)
        for root, _, files in sorted(os.walk(web_dir)):
            for f in sorted(files):
                full = os.path.join(root, f)
                rel = os.path.relpath(full, web_dir).replace(os.sep, '/')
                write_aligned(zf, f'assets/www/{rel}', open(full, 'rb').read(), True)
    print(f'wrote {out_path}')


if __name__ == '__main__':
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
