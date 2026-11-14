import { parsePromoUrl } from "../lib/promo";

interface PromoStageProps {
  url: string;
}

export function PromoStage({ url }: PromoStageProps) {
  const embed = parsePromoUrl(url);

  return (
    <section className="promo-stage" aria-label="Current briefing">
      <div className="promo-stage-frame">
        {embed.kind === "youtube" || embed.kind === "vimeo" ? (
          <iframe
            className="promo-stage-media"
            src={embed.src}
            title="Video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : embed.kind === "file" ? (
          <video
            className="promo-stage-media"
            src={embed.src}
            autoPlay
            muted
            loop
            playsInline
            controls
          />
        ) : (
          <div className="promo-stage-empty">
            <p className="promo-stage-kicker">LIVE BRIEFING</p>
            <p className="promo-stage-empty-title">
              {embed.kind === "invalid"
                ? "That link is not a YouTube, Vimeo, or video file."
                : "The current reel plays here."}
            </p>
            <p className="promo-stage-empty-copy">
              Same window. Same size. Paste a link when the next piece is ready.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
