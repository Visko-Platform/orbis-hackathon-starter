// Grabs the current picture from a playing <video> as a 16:9 JPEG. Used to read
// the scene contract from the live take. WebRTC video draws to a canvas without
// tainting it.
export async function captureVideoFrame(video: HTMLVideoElement): Promise<File> {
  if (!video.videoWidth || !video.videoHeight) throw new Error("The live video has no frame yet.");
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Frame capture is unavailable in this browser.");
  context.fillStyle = "#000000";
  context.fillRect(0, 0, 1280, 720);
  const scale = Math.min(1280 / video.videoWidth, 720 / video.videoHeight);
  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;
  context.drawImage(video, (1280 - width) / 2, (720 - height) / 2, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not encode the live frame.")), "image/jpeg", .9));
  return new File([blob], "live-frame.jpg", { type: "image/jpeg" });
}
