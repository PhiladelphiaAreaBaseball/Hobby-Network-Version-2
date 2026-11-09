import { Badge, AGE_LABEL, CATEGORY_LABEL, CATEGORY_TONE } from "../../components/ui";
import { I } from "../../components/icons";
import { navigate } from "../../core/router";
import type { Lesson } from "../../core/types";
export function LessonCard({ lesson, done, favorite, onFavorite, compact }: { lesson: Lesson; done?: boolean; favorite?: boolean; onFavorite?: () => void; compact?: boolean }) {
  const eqFree = lesson.equipment.every((e) => e === "none") || !!lesson.equipmentFreeAlternative;
  return <div className="card card-clickable" style={{ display: "grid", gap: ".5rem", padding: compact ? ".8rem .9rem" : "1rem 1.1rem", position: "relative" }}>
    <button className="link-btn" style={{ position: "absolute", inset: 0, opacity: 0 }} onClick={() => navigate("lesson", lesson.id)} aria-label={`Open lesson ${lesson.title}`} />
    <div className="flex items-center gap-2 wrap"><Badge tone={CATEGORY_TONE[lesson.category]}>{CATEGORY_LABEL[lesson.category]}</Badge><span className="xsmall muted">{lesson.subcategory}</span>{done && <Badge tone="grass"><I.check size={12} /> Done</Badge>}{onFavorite && <button className="btn btn-ghost btn-icon" style={{ marginLeft: "auto", position: "relative", zIndex: 1, width: "1.9rem", height: "1.9rem" }} aria-label={favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={favorite} onClick={(e) => { e.stopPropagation(); onFavorite(); }}>{favorite ? <I.starFilled size={16} style={{ color: "var(--gold)" }} /> : <I.star size={16} />}</button>}</div>
    <strong style={{ fontSize: compact ? ".95rem" : "1.05rem", lineHeight: 1.25 }}>{lesson.title}</strong>
    {!compact && <p className="small muted" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{lesson.summary}</p>}
    <div className="flex gap-2 wrap xsmall muted"><span>{lesson.ageGroups.map((a) => AGE_LABEL[a].replace("Ages ", "")).join(", ")}</span><span>·</span><span>{lesson.skillLevel}</span><span>·</span><span>{lesson.durationMin} min</span>{eqFree && <><span>·</span><span style={{ color: "var(--grass)" }}>no-equipment option</span></>}</div>
  </div>;
}
