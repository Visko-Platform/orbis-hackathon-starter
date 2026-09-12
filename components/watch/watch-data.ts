// Fictional page content for the viewer demo. The clip itself is the Blender
// Foundation's Sintel trailer (CC BY 3.0), credited in the description.

export const featured = {
  title: "Sintel — Official Trailer (Open Movie)",
  src: "/scenes/sintel-trailer.mp4",
  poster: "/scenes/sintel-poster.png",
  channel: { name: "Open Movie Trailers", handle: "@openmovietrailers", subscribers: "2.1M subscribers", initial: "O" },
  views: "1,204,981 views",
  posted: "Sep 3, 2023",
  likes: "48K",
  tags: ["#shortfilm", "#animation", "#openmovie"],
  description: [
    "A lone girl crosses a frozen mountain pass in search of the dragon she once rescued. The trailer for Sintel, the third open movie, made with free software and released for everyone to watch, share and remix.",
    "Watch the full film and download the production files on the project site.",
  ],
  credit: "© copyright Blender Foundation | durian.blender.org · Creative Commons Attribution 3.0",
  commentCount: "412 Comments",
};

export type UpNextItem = { id: string; title: string; channel: string; meta: string; duration: string; poster?: string; hue: number; verified?: boolean };

export const upNext: UpNextItem[] = [
  { id: "bunny-trailer", title: "Big Buck Bunny — Official Trailer", channel: "Open Movie Trailers", meta: "3.4M views · 4 years ago", duration: "0:33", poster: "/scenes/thumbs/bunny-face.jpg", hue: 90, verified: true },
  { id: "sintel-film", title: "Sintel — the complete open movie", channel: "Open Movie Trailers", meta: "12M views · 4 years ago", duration: "14:48", poster: "/scenes/thumbs/sintel-sunset.jpg", hue: 200, verified: true },
  { id: "bunny-meadow", title: "Big Buck Bunny — Meadow morning, the first five minutes", channel: "Open Movie Trailers", meta: "1.1M views · 4 years ago", duration: "5:00", poster: "/scenes/thumbs/bunny-burrow.jpg", hue: 100, verified: true },
  { id: "dragon", title: "How Sintel's dragon was animated — a shot-by-shot breakdown", channel: "Frame Rate", meta: "266K views · 2 weeks ago", duration: "20:41", poster: "/scenes/thumbs/sintel-dragon.jpg", hue: 22 },
  { id: "trailer-cut", title: "Cutting a 33-second trailer: Big Buck Bunny, frame by frame", channel: "Frame Rate", meta: "97K views · 1 month ago", duration: "11:25", poster: "/scenes/thumbs/bunny-butterfly.jpg", hue: 150 },
  { id: "durian", title: "Sintel behind the scenes — inside the Durian studio", channel: "Studio Diaries", meta: "812K views · 6 months ago", duration: "14:08", poster: "/scenes/thumbs/sintel-city.jpg", hue: 42 },
  { id: "remaster", title: "Big Buck Bunny remastered — the meadow scene in 4K", channel: "Open Movie Trailers", meta: "420K views · 8 months ago", duration: "9:52", poster: "/scenes/thumbs/bunny-rodents.jpg", hue: 120, verified: true },
  { id: "score", title: "Scoring Sintel: the mountain theme with a full orchestra", channel: "Cue Sheet", meta: "54K views · 3 days ago", duration: "17:30", poster: "/scenes/thumbs/sintel-mountain.jpg", hue: 275 },
  { id: "rodents", title: "Big Buck Bunny — meet the three rodents", channel: "Open Movie Trailers", meta: "2.2M views · 4 years ago", duration: "3:12", poster: "/scenes/thumbs/bunny-squirrel.jpg", hue: 30, verified: true },
  { id: "dunes", title: "Sintel's dunes: lighting a desert at golden hour", channel: "Frame Rate", meta: "131K views · 3 weeks ago", duration: "12:03", poster: "/scenes/thumbs/sintel-dunes.jpg", hue: 40 },
];

export const filterChips = ["All", "Short films", "Animation", "Watches", "Cinematography", "Design", "Music", "Travel", "Recently uploaded"];

export type Comment = { author: string; when: string; text: string; likes: string; hue: number };

export const comments: Comment[] = [
  { author: "@marta.frames", when: "2 years ago", text: "The mountain pass shot at 0:31 still gives me chills. Every frame of this is a painting.", likes: "1.2K", hue: 340 },
  { author: "@devon_edits", when: "1 year ago", text: "Made with free software, released for free, and it looks like this. Incredible what the open movie projects achieved.", likes: "864", hue: 210 },
  { author: "@quietcinema", when: "8 months ago", text: "Came for the trailer, stayed for the score. Who did the music?", likes: "153", hue: 120 },
  { author: "@len.k", when: "3 months ago", text: "Rewatching before the full film tonight. The dragon design holds up so well.", likes: "47", hue: 30 },
];
