#!/usr/bin/env python3
"""
Original ambient piano piece for "A Diwali Surprise for Mahi".
Generates assets/music/diwali-piano.mp3 (no samples, no copyright - fully synthesized).
Usage: python3 generate_music.py   (requires ffmpeg with libmp3lame)
"""
import math, os, struct, subprocess, tempfile, wave

SR = 22050
BPM = 60.0
BEAT = 60.0 / BPM          # 1.0 s per beat
BARS = 16                  # 16 bars * 4 beats = 64 seconds, loops seamlessly
TOTAL = int(BARS * 4 * BEAT * SR)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_MP3 = os.path.join(HERE, "diwali-piano.mp3")

def hz(m):                 # midi -> frequency
    return 440.0 * 2.0 ** ((m - 69) / 12.0)

# ----------------------------------------------------------------- harmony
# (bass_midi, [triad midi notes])
D      = (38, [50, 54, 57])
A_Cs   = (37, [57, 61, 64])
Bm     = (35, [50, 54, 59])
G      = (31, [50, 55, 59])
A      = (33, [52, 57, 61])
PROG = [D, A_Cs, Bm, G,  D, A, G, A,  Bm, G, D, A,  G, A, D, D]

# ----------------------------------------------------------------- melody
# (start_beat, midi, duration_beats)
MELODY = [
    (0.0,74,1.5),(1.5,78,0.5),(2.0,81,2.0),
    (4.0,83,1.0),(5.0,81,1.0),(6.0,78,2.0),
    (8.0,79,1.5),(9.5,78,0.5),(10.0,76,2.0),
    (12.0,78,1.0),(13.0,76,1.0),(14.0,74,2.0),
    (16.0,81,1.5),(17.5,83,0.5),(18.0,86,2.0),
    (20.0,85,1.0),(21.0,83,1.0),(22.0,81,2.0),
    (24.0,83,1.5),(25.5,81,0.5),(26.0,79,2.0),
    (28.0,81,1.0),(29.0,79,1.0),(30.0,78,2.0),
    (32.0,83,2.0),(34.0,81,1.0),(35.0,79,1.0),
    (36.0,78,1.5),(37.5,76,0.5),(38.0,74,2.0),
    (40.0,74,1.0),(41.0,78,1.0),(42.0,81,2.0),
    (44.0,85,1.5),(45.5,83,0.5),(46.0,81,2.0),
    (48.0,79,1.5),(49.5,81,0.5),(50.0,83,2.0),
    (52.0,85,1.0),(53.0,83,1.0),(54.0,81,2.0),
    (56.0,78,1.5),(57.5,76,0.5),(58.0,74,2.0),
    (60.0,74,4.0),
]

# ----------------------------------------------------------------- voices
def add_note(buf, start_s, midi, dur_s, amp, bright=1.0, kind="piano"):
    """Render one note into buf (mono float list)."""
    n0 = int(start_s * SR)
    n1 = min(len(buf), n0 + int((dur_s + 2.5) * SR))
    if n0 >= len(buf):
        return
    f = hz(midi)
    if kind == "piano":
        harms = [1.0, 0.52, 0.28, 0.15, 0.08, 0.045]
        decays = [1.5, 1.9, 2.4, 3.1, 3.9, 4.8]
        attack = 0.004
    elif kind == "bell":
        harms = [1.0, 0.6, 0.35, 0.2, 0.12]
        decays = [1.0, 1.4, 2.0, 2.6, 3.3]
        attack = 0.002
    else:  # pad
        harms = [1.0, 0.5, 0.28, 0.14, 0.07]
        decays = [0.5, 0.55, 0.6, 0.7, 0.8]
        attack = 1.1
    rel = 1.2 if kind == "pad" else 0.35
    count = len(harms)
    two_pi_f = [2.0 * math.pi * f * (i + 1) / SR for i in range(count)]
    phase = [0.0] * count
    atk_n = max(1, int(attack * SR))
    end_n = n0 + int(dur_s * SR)
    for n in range(n0, n1):
        i = n - n0
        t = i / SR
        if i < atk_n:
            env = i / atk_n
        elif n > end_n:
            env = math.exp(-(n - end_n) / SR * (1.0 / rel))
            if env < 0.0015:
                break
        else:
            env = 1.0
        s = 0.0
        for h in range(count):
            phase[h] += two_pi_f[h]
            if phase[h] >= 6.283185307:
                phase[h] -= 6.283185307
            s += harms[h] * math.sin(phase[h]) * math.exp(-t * decays[h] / bright)
        buf[n] += s * env * amp

# ----------------------------------------------------------------- arrange
mix = [0.0] * TOTAL

for bar in range(BARS):
    t0 = bar * 4 * BEAT
    bass, triad = PROG[bar]

    # warm pad: bass + triad, long soft swell
    add_note(mix, t0, bass, 4.0 * BEAT, 0.16, kind="pad")
    for k, m in enumerate(triad):
        add_note(mix, t0, m, 4.0 * BEAT, 0.085 - k * 0.012, kind="pad")
        add_note(mix, t0 + 0.012, m + 12, 4.0 * BEAT, 0.035, kind="pad")  # detuned shimmer

    # gentle left-hand arpeggio (eighth notes, soft)
    arc = [triad[0], triad[1], triad[2], triad[1] + 12,
           triad[0] + 12, triad[1] + 12, triad[2], triad[1]]
    for j, m in enumerate(arc):
        vel = 0.075 if j % 4 == 0 else 0.052
        add_note(mix, t0 + j * 0.5 * BEAT, m, 0.5 * BEAT, vel, bright=1.35)

    # soft chime on phrase starts (diwali sparkle)
    if bar in (0, 4, 8, 12):
        add_note(mix, t0, triad[0] + 24, 4.0, 0.045, kind="bell")

# melody (music-box / soft piano top line)
for (b, m, d) in MELODY:
    add_note(mix, b * BEAT, m, d * BEAT, 0.15, bright=1.5)

# ----------------------------------------------------------------- reverb
def comb(x, delay, g):
    y = list(x)
    L = len(y)
    for i in range(delay, L):
        y[i] += g * y[i - delay]
    return y

def allpass(x, delay, g):
    L = len(x)
    y = [0.0] * L
    for i in range(L):
        xd = x[i - delay] if i >= delay else 0.0
        yd = y[i - delay] if i >= delay else 0.0
        y[i] = -g * x[i] + xd + g * yd
    return y

def reverb(x):
    wet = [0.0] * len(x)
    for d in (779, 809, 746, 711):
        c = comb(x, d, 0.76)
        for i in range(len(wet)):
            wet[i] += c[i] * 0.25
    wet = allpass(wet, 113, 0.5)
    wet = allpass(wet, 278, 0.5)
    return wet

dry = mix
wetL = reverb(mix)
wetR = reverb([0.0] * 37 + mix[:TOTAL - 37])   # slight offset for width

Lch = [0.0] * TOTAL
Rch = [0.0] * TOTAL
peak = 1e-9
for i in range(TOTAL):
    l = dry[i] * 0.8 + wetL[i] * 0.34
    r = dry[i] * 0.8 + wetR[i] * 0.34
    Lch[i], Rch[i] = l, r
    a = abs(l) if abs(l) > abs(r) else abs(r)
    if a > peak:
        peak = a

gain = 0.86 / peak
fade = int(0.04 * SR)
frames = bytearray()
for i in range(TOTAL):
    g = gain
    if i < fade:
        g *= i / fade
    elif i > TOTAL - fade:
        g *= (TOTAL - i) / fade
    frames += struct.pack("<hh", int(max(-32767, min(32767, Lch[i] * 32767 * g))),
                                 int(max(-32767, min(32767, Rch[i] * 32767 * g))))

with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
    wav_path = tmp.name
with wave.open(wav_path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(bytes(frames))

subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
                "-codec:a", "libmp3lame", "-b:a", "96k", OUT_MP3], check=True)
os.remove(wav_path)
print("wrote", OUT_MP3, os.path.getsize(OUT_MP3), "bytes")
