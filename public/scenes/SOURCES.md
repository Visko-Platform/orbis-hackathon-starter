# Scene media sources

The Scene library uses open-movie material created by the Blender Foundation.
The files are stored locally so the hackathon demo does not depend on a third-party
video host during a live presentation.

## Sintel

- Project and downloads: https://durian.blender.org/download/
- Trailer file: https://media.w3.org/2010/05/sintel/trailer.mp4
- Poster frame: https://media.w3.org/2010/05/sintel/poster.png
- Local files: `sintel-trailer.mp4`, `sintel-poster.png`
- Credit: © copyright Blender Foundation | durian.blender.org
- License: Creative Commons Attribution 3.0
  (https://creativecommons.org/licenses/by/3.0/)

## Big Buck Bunny

- Project: https://studio.blender.org/films/big-buck-bunny/
- Trailer file: https://media.w3.org/2010/05/bunny/trailer.mp4
- Poster frame: https://media.w3.org/2010/05/bunny/poster.png
- Local files: `bunny-trailer.mp4`, `bunny-poster.png`
- Credit: © copyright 2008, Blender Foundation | bigbuckbunny.org
- License: Creative Commons Attribution 3.0
  (https://creativecommons.org/licenses/by/3.0/)

## Tears of Steel

- Project: https://mango.blender.org/
- Clip file: the 480p VP9 transcode of
  https://commons.wikimedia.org/wiki/File:Tears_of_Steel_clip.ogv
- Poster frame: a centre crop of
  https://commons.wikimedia.org/wiki/File:Tears_of_Steel_frame_01_2a.jpg
  (3840x1600 cropped to 16:9 and scaled to 1280x720, so the reference frame is
  not stretched when it is composed)
- Local files: `tears-of-steel-clip.webm`, `tears-of-steel-poster.jpg`
- Credit: © copyright Blender Foundation | mango.blender.org
- License: Creative Commons Attribution 3.0
  (https://creativecommons.org/licenses/by/3.0/)

The included poster images and video excerpts are used as source footage and
starting frames; Adtractive does not imply sponsorship or endorsement by Blender.

## Thumbnails

`thumbs/*.jpg` are single frames cut from the clips above with AVFoundation
(no other source). They are the "Up next" thumbnails on the `/watch` demo page
and carry the same credits and license as the clips.
