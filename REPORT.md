# Kutilang Valley Run — REPORT

Kompetisi: **Make the best flight game** (`best-flight-game-20261126-0057`), $500
(1st $100, top 50 dibayar), deadline **28 Nov 2026 07:57 WIB**.
Repo: https://github.com/skipsektestnet/makefun-best-flight-game

## Playtest end-to-end: LOLOS (v14, 26 Nov ~12:24 WIB)

Autopilot (`~/workspace/_tmp/pwtest/playtest-flight2.mjs`, Playwright + Chromium,
serve via `serve.ts`, `?seed=7&lowfx=1`) memainkan sortie 1 dari awal sampai akhir:

- Takeoff dari Runway 36, climb, **6/6 ring dilewati** (ring 1 t=71 dtk, ring 2
  t=168 dtk, ring 3 t=249 dtk, ring 4 t=381 dtk, ring 5 t=467 dtk, ring 6 t=538 dtk)
- **Mendarat di Runway 36 — SORTIE CLEAR, skor 930** (ring 680 incl. 2 centre
  bonus +40 masing-masing, +100 landing, +150 bonus waktu), fuel tersisa 18%
- **Tidak ada page error** di seluruh run; screenshot akhir memverifikasi kartu
  "SORTIE CLEAR — A gentle touchdown on Runway 36. Score 930 · Rings 6 / 6"

## Bug game yang ditemukan & diperbaiki (commit 622a860)

1. **`game/src/missions.js` — ring-pass throw (bug nyata):** `stepMission`
   memanggil `ring.userData.index`, tapi `checkPass` mengembalikan record ring
   polos (tanpa `userData` — itu milik mesh). Setiap ring yang dilewati melempar
   `Cannot read properties of undefined (reading 'index')`, ring tidak pernah
   berubah warna jadi hijau dan ring berikutnya tidak pernah menyala. Perbaikan
   1 baris: pakai `state.course.nextIndex - 1` (index yang baru dilewati
   checkPass). Terverifikasi: v8–v14 tanpa page error.
2. **`game/src/flight.js` — NaN di frame pertama (dari sesi sebelumnya):**
   `windX / dt * 0` saat `dt=0` meracuni `f.x` jadi NaN selamanya. Sudah diperbaiki
   sebelum sesi ini (1 baris); playtest v4–v14 tidak pernah kambuh.

## Iterasi autopilot (harness saja, bukan kode game)

- v4–v5: orbit murni (pure pursuit) → line-following guidance (koreksi cross-track).
- v6–v7: pesawat terbang DI BAWAH ring pertama (naik terlalu lambat) → fase climb
  (pitch −0.44, 30 m/s sampai 8 m dari ketinggian ring).
- v8: orbit di sekitar ring (radius belok ~280 m > jarak ke ring) → go-around:
  terbang 300 m melewati ring sepanjang garis course, lalu kembali lurus.
- v9–v10: pendaratan gagal (kecepatan final 41 > batas 38; lalu pure pursuit
  menarik pesawat berbelok saat melewati threshold) → final 33 m/s, descent
  +0.25, tanpa pure pursuit saat returning.
- v11: pesawat mendarat 50 m di luar centreline (garis dari ring terakhir hanya
  memotong centreline di threshold) → runway mode: heading π + koreksi offset-x.
- v12–v13: pesawat melayang di 9–21 m di atas strip (target ketinggian naik lagi
  melewati threshold; pitch error-tracker merata di +0.05) → glide slope 8%
  diukur SEPANJANG runway dari threshold + pitch 0.22 rad mengikuti slope.
- v14: **lolos penuh.**

## Status penyerahan

- Commit lokal: `622a860cd17754d3792488f88c33daeb667a2429` ("Fix ring-pass crash…")
- Remote HEAD (GitHub `skipsektestnet/makefun-best-flight-game`, branch main):
  `622a860cd17754d3792488f88c33daeb667a2429` — **sama dengan lokal, terverifikasi**
- Working tree bersih; 26 file.
- README: 3 badge live make.fun (competition/rank/reward) + referral `jeq52989` ✓
- `.makefun/owner.json`: wallet `9K6KA14C3Uck65pqVYtsH2T4KnuW4WpJyySNHd9Rk8Rh` ✓
- Repo About: topics `makefun,ai-agents,bounties,growth`, homepage bounty ✓
  (disetel saat repo dibuat, commit faf2805d)
- Dossier check: `MAKEFUN_OUTPUT_DIR=/tmp/flight-out2 node main.ts` → exit 0,
  "handed in 4 screenshots", dossier.json 383.523 byte (< 1,5 MiB).
- Screenshots: 4 file, masing-masing < 256 KiB, terverifikasi visual (cover =
  chase view di atas sungai, ring amber di depan).

## Sisa yang belum

- **Bundle + submit — BELUM.** Menunggu persetujuan Aarthi (parent yang
  menjalankan). Deadline 28 Nov 2026 07:57 WIB. Entry belum tercatat di
  `submissions.json`.
- Catatan: playtest hanya memainkan sortie 1 (River Run). Sortie 2–3 memakai
  mesin, ring, dan logika pendaratan yang sama; tidak ada alasan mengira mereka
  rusak, tapi belum di-playtest end-to-end.
