# Voice-controlled movie demo

1. Open the local Cutline studio in Chrome or Edge. Connect Reactor and Nebius, enter the film and wait for moving frames.
2. Close any open audience vote. Use headphones so the film audio does not feed back into the microphone.
3. Click **Talk to the movie** directly on the film. Allow the browser microphone prompt.
4. Say one visible change: **“Mara opens the door slowly.”** Finish the sentence and pause. The transcript appears, Nebius plans the next beat, and Orbis receives it.
5. Watch the accepted-command trace and the next movie chunks. Listening resumes after delivery. Try **“The camera moves closer to the brass compass.”**
6. Click **Stop microphone** when finished. Pausing the film, opening voting or changing rooms also stops recognition.

The movie is generated live; speech recognition and provider latency depend on the browser, network and model. Command acknowledgement does not guarantee exact visual execution. The cosmic opening remains a continuous Three.js visualization using sourced imagery, not a new Blender-rendered movie.

Verification for this change: typecheck, lint, production build and mocked voice lifecycle cases passed. The studio loaded in the browser. An actual spoken-command rehearsal with the user's microphone remains to be performed; do not label mocked speech as a real provider test.
