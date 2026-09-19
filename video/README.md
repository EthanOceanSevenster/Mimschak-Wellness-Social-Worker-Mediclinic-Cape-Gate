# Hero background video

Drop a file here and the home page hero uses it automatically. No code change.

    hero.webm    preferred (VP9/AV1, smaller file)
    hero.mp4     fallback (H.264, needed for Safari)

If neither exists, the hero falls back to the existing background photograph —
nothing breaks.

## What actually suits this practice

Calm and abstract, not literal. Avoid stock footage of "therapy sessions" —
posed actors nodding sympathetically read as fake and undercut the trust the
rest of the page is building. What works:

- soft daylight moving through a window or curtain
- shallow-focus greenery, leaves shifting slowly
- still water, gentle ripples
- out-of-focus warm light, very slow drift

## Hard requirements

- **Under 4 MB.** It loads on every visit to the home page, often on mobile
  data in South Africa. Trim to 8-12 seconds and loop it.
- **Seamless loop.** A visible jump is worse than no video.
- **No faces, no text.** The headline sits on top and the crop changes with
  the viewport.
- **Slow motion in-frame.** Anything fast fights the copy and is exactly what
  an anxious visitor does not need.
- **Silent.** It is muted and has no controls, which is also what permits
  autoplay on mobile.

## Where to get it, licensed

Pexels Videos, Pixabay, Coverr — all free for commercial use, no attribution
required. Check the licence on the individual clip before using it.

## Compressing it

    ffmpeg -i source.mp4 -t 10 -an -vf "scale=1920:-2" -c:v libx264 -crf 30 -preset slow hero.mp4
    ffmpeg -i hero.mp4 -c:v libvpx-vp9 -crf 38 -b:v 0 -an hero.webm

`-an` strips the audio track: it is muted anyway, so shipping it is wasted bytes.
