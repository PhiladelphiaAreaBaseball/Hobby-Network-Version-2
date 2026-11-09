/* Third-party drill videos live on YouTube. The artifact frame cannot embed other sites or load their thumbnails, so the
   card presents the title and channel and opens the video in a new tab. In a hosted deployment the same component can
   render an iframe embed. */
import type { DrillVideo } from "../core/types";
import { I } from "./icons";
export function YouTubeCard({ video, compact }: { video: DrillVideo; compact?: boolean }) {
  return <a className="yt-card" href={video.url} target="_blank" rel="noopener noreferrer" aria-label={`Watch on YouTube: ${video.title} by ${video.channel}`}>
    <span className="yt-play" aria-hidden="true"><I.play size={compact ? 22 : 30} /></span>
    <span className="yt-text"><span className="yt-eyebrow">Watch on YouTube</span><strong className="yt-title">{video.title}</strong><span className="yt-channel">{video.channel}{!compact && video.note ? ` · ${video.note}` : ""}</span></span>
    <I.external size={16} className="yt-ext" />
  </a>;
}
