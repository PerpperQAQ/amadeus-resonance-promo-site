"""E-mote 模型轻量化：RGBA8 贴图 → 透明像素 RGB 清零 + RGB 每通道量化到 6 bit（不抖动，alpha 保留 8 bit），仍为 RGBA8 → gzip
（v1 用 RGBA4444 + 4×4 有序抖动，衣服上能看到网点，v2 起弃用；--mode 4444 仍可生成旧格式），输出 public/models/*.lite.v<N>.psbz。

只读原模型（public/models/*.expressions.psb，spec=common/RGBA8），从不覆盖。除贴图类型字符串与贴图字节外，
名称表、条目、全部 extra 资源逐字节保留；写出后重新解析并校验。PSB 读取复用
amadeus-system-new/.local_live2d_assets/reboot_20260905/inspect_reboot.py（格式参考 FreeMote，CC BY-NC-SA 4.0）。

用法：python3 scripts/model-lite.py            # 两套模型
      python3 scripts/model-lite.py --version 2 # 改版本号以绕过浏览器缓存（同时改 src/emote-stage.js 的 LITE_VERSION）
.psbz = 原始 gzip 字节；扩展名刻意不用 .gz，避免静态服务器自动加 Content-Encoding。"""
import sys, struct, zlib, gzip, argparse, os
sys.path.insert(0, '/Users/perpperqaq/Documents/Codex/amadeus-system-new/.local_live2d_assets/reboot_20260905')
import numpy as np
from inspect_reboot import PSB

def array(values):
    cw = max(1, (len(values).bit_length() + 7) // 8); w = max(1, (max(values, default=0).bit_length() + 7) // 8)
    return bytes([12 + cw]) + len(values).to_bytes(cw, 'little') + bytes([12 + w]) + b''.join(v.to_bytes(w, 'little') for v in values)

BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + .5) / 16 - .5

def to4444(rgba, w, h):
    f = np.frombuffer(rgba, np.uint8).reshape(h, w, 4).astype(np.float32)
    f[..., :3] += np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w, None] * 17
    a = np.clip(np.round(f / 17), 0, 15).astype(np.uint16).reshape(-1, 4)
    return ((a[:, 0] << 12) | (a[:, 1] << 8) | (a[:, 2] << 4) | a[:, 3]).astype('<u2').tobytes()

def to_q6(rgba, w, h):
    a = np.frombuffer(rgba, np.uint8).reshape(h, w, 4).copy(); a[a[..., 3] == 0] = 0
    a[..., :3] = (a[..., :3] & 0xFC) | 2 * (a[..., :3] >> 7)  # 6 bit，低位按高位补齐，0→0、255→254
    return a.tobytes()

def convert(src, dst, mode='q6'):
    raw = open(src, 'rb').read(); p = PSB(raw); obj = p.value()
    assert p.version == 4 and obj['spec'] == 'common'
    header = list(struct.unpack_from('<12I', raw, 8))
    _, names, strings_start, string_data, offsets_start, _, _, entries, _, extra_offsets, extra_lengths, extra_data = header
    new, offs, size = [], [], 0
    for o in p.strings:
        s = raw[string_data + o: raw.index(b'\0', string_data + o)]
        s = {b'RGBA8': b'RGBA4444'}.get(s, s) if mode == '4444' else s; offs.append(size); new.append(s + b'\0'); size += len(s) + 1
    out = bytearray(raw[:strings_start]); out += array(offs); header[3] = len(out); out += b''.join(new)
    shift = len(out) - extra_offsets; header[9:12] = [x + shift for x in header[9:12]]
    out += raw[extra_offsets:offsets_start]
    res = {}
    for name, v in obj['source'].items():
        t = v['texture']; i = t['pixel']['$resource']; assert t['type'] == 'RGBA8'
        res[i] = (to4444 if mode == '4444' else to_q6)(p.resource(i), t['width'], t['height'])
    assert set(res) == set(range(len(p.chunks)))
    offsets, sizes, size = [], [], 0
    for i in range(len(res)): offsets.append(size); sizes.append(len(res[i])); size += sizes[-1]
    header[4] = len(out); out += array(offsets); header[5] = len(out); out += array(sizes); out += b'\0' * (-len(out) % 16); header[6] = len(out)
    for i in range(len(res)): out += res[i]
    struct.pack_into('<12I', out, 8, *header); struct.pack_into('<I', out, 40, zlib.adler32(out[8:40] + out[44:56]))
    q = PSB(bytes(out)); exp = obj
    if mode == '4444':
        for v in exp['source'].values(): v['texture']['type'] = 'RGBA4444'
    assert q.value() == exp and len(q.extra_chunks) == len(p.extra_chunks)
    for i in range(len(p.extra_chunks)): assert q.resource(i, True) == p.resource(i, True)
    open(dst, 'wb').write(gzip.compress(bytes(out), 9, mtime=0))
    print(f'{src}: {len(raw):,} B -> {len(out):,} B ({mode}) -> {os.path.getsize(dst):,} B gzip  {dst}')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--version', type=int, default=2); ap.add_argument('--mode', default='q6', choices=['q6', '4444']); a = ap.parse_args()
    for alias in ('kurisu_ab', 'kurisu_ab_labcoat'):
        convert(f'public/models/{alias}.expressions.psb', f'public/models/{alias}.lite.v{a.version}.psbz', a.mode)
