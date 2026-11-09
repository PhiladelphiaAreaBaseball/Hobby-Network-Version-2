/* Domain model. Every tenant-owned record carries `leagueId`. Content records are platform-wide unless `leagueId` is set
   (league-level override or league-authored content). Mirrors prisma/schema.prisma, the target relational schema. */

export type ID = string;
export type ISODate = string; // "2026-04-18"
export type ISODateTime = string; // "2026-04-18T17:30:00"

export type AgeGroupId = "a4_6" | "a7_8" | "a9_10" | "a11_12" | "a13_16";
export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type Category = "hitting" | "throwing" | "fielding" | "baserunning" | "positions" | "baseball_iq" | "mental";
export type Equipment = "none" | "ball" | "soft_ball" | "tennis_ball" | "glove" | "bat" | "tee" | "helmet" | "cones" | "net" | "bucket" | "wall" | "bases" | "catcher_gear" | "l_screen";
export type Location = "backyard" | "driveway" | "garage" | "indoor_small" | "park" | "field";
export type DrillPhase = "warmup" | "skill" | "game" | "cooldown";
export type ThrowingLoad = "none" | "light" | "moderate" | "high";
export type VideoRef = { status: "placeholder"; note: string } | { status: "linked"; url: string; durationSec: number; captions: boolean; transcript?: string; note: string; provider?: "youtube" | "hosted"; videoId?: string; title?: string; channel?: string };
export interface DrillVideo { id: ID; drillId: ID; url: string; videoId: string; title: string; channel: string; note: string; verifiedAt: string; leagueId?: ID; }

/* ---------- Roles & permissions ---------- */
export type Role =
  | "platform_admin" | "league_admin" | "board_member" | "division_commissioner"
  | "head_coach" | "assistant_coach" | "guardian" | "player" | "umpire" | "volunteer";

export type Permission =
  | "platform.manage" | "league.manage" | "league.settings" | "league.website" | "league.finance" | "league.finance.view"
  | "league.registrations" | "league.schedule" | "league.fields" | "league.volunteers" | "league.sponsors" | "league.communications"
  | "league.content" | "league.reports" | "league.members"
  | "division.manage" | "team.manage" | "team.view" | "team.attendance" | "team.notes" | "team.assign" | "team.message" | "team.pitching" | "team.video_review"
  | "family.manage" | "family.register" | "family.pay" | "family.academy" | "family.messages" | "family.video_upload"
  | "player.academy" | "umpire.assignments" | "volunteer.shifts"
  | "league.tryouts" | "tryout.evaluate" | "team.gameday" | "league.safety" | "league.umpires";

export interface Membership {
  id: ID; userId: ID; leagueId: ID; role: Role;
  teamIds?: ID[]; divisionIds?: ID[];
  extraPermissions?: Permission[]; // configurable board-member permissions
  title?: string; // "Treasurer", "Safety Officer"
}

export interface User {
  id: ID; firstName: string; lastName: string; email: string; phone?: string;
  avatarColor?: string; createdAt: ISODateTime;
  notificationPrefs?: NotificationPrefs;
}
export interface NotificationPrefs { email: boolean; sms: boolean; push: boolean; digest: "immediate" | "daily" | "weekly"; categories: Record<string, boolean>; }

/* ---------- League / tenant ---------- */
export interface League {
  id: ID; slug: string; name: string; shortName: string; city: string; state: string; charterNumber?: string;
  colors: { primary: string; secondary: string; accent: string }; logoText: string; // initials used in marks
  subdomain: string; customDomain?: string; timezone: string;
  contactEmail: string; address?: string; founded?: number;
  subscription: { planId: ID; status: "trial" | "active" | "past_due" | "cancelled"; trialEndsAt?: ISODate; renewsAt?: ISODate; seats?: number };
  settings: LeagueSettings;
  ageGroupLabels: Record<AgeGroupId, string>; logoAssetId?: string;
  createdAt: ISODateTime;
}
export interface LeagueSettings {
  eligibility: EligibilityConfig;
  pitchCount: PitchCountConfig;
  registration: { familyDiscountPct: number; lateFee: number; refundPolicy: string; financialAssistance: boolean; paymentPlans: boolean };
  safety: { requireBackgroundCheck: boolean; photoConsentRequired: boolean; videoReviewEnabled: boolean; videoRetentionDays: number; maxVideoUploadsPerPlayer: number };
  communications: { allowCoachToParentDM: boolean; quietHoursStart: string; quietHoursEnd: string };
  umpires?: { payByDivision: Record<ID, number>; twoUmpireDivisions: ID[] };
  shareToken?: string | null;
}
export interface EligibilityConfig {
  ageDeterminationDate: ISODate; // league age = age on this date (configured per season from the current rulebook)
  requiresResidenceOrSchoolVerification: boolean;
  residenceDocumentsRequired: number; // e.g. 3 documents from the league's list
  schoolEnrollmentAllowed: boolean;
  requiredWaivers: string[];
  notes: string;
}
export interface PitchCountConfig {
  source: string; // "League-configured. Verify against the current Little League rulebook."
  maxPitchesByLeagueAge: { minAge: number; maxAge: number; maxPitches: number }[];
  restDays: { minPitches: number; maxPitches: number; restDays: number }[];
  catcherRule: string;
}

export interface Season { id: ID; leagueId: ID; name: string; year: number; startDate: ISODate; endDate: ISODate; registrationOpens: ISODate; registrationCloses: ISODate; status: "upcoming" | "registration" | "active" | "complete"; }
export interface Division {
  id: ID; leagueId: ID; seasonId: ID; name: string; shortName: string; ageGroup: AgeGroupId;
  minLeagueAge: number; maxLeagueAge: number; fee: number; capacity: number; waitlistEnabled: boolean;
  curriculumId?: ID; commissionerUserId?: ID; description: string; gameLengthInnings: number; baseDistanceFt: number; pitchingDistanceFt: number; machineOrCoachPitch?: "tee" | "coach" | "machine" | "player";
  playRules?: PlayRules; // league-configured minimum-play rules used by the lineup card builder
}
export interface PlayRules { minFieldInnings: number; maxConsecutiveBench: number; everyoneBats: boolean; note: string; }
export interface Team {
  id: ID; leagueId: ID; seasonId: ID; divisionId: ID; name: string; color: string; abbreviation: string;
  headCoachUserId?: ID; assistantCoachUserIds: ID[]; sponsorId?: ID; practiceSlot?: string; logoAssetId?: string;
  record?: { wins: number; losses: number; ties: number };
}
export interface Player {
  id: ID; leagueId: ID; firstName: string; lastName: string; displayName: string; birthDate: ISODate; leagueAge: number;
  teamId?: ID; divisionId?: ID; jerseyNumber?: number; positions: string[]; bats: "R" | "L" | "S"; throws: "R" | "L";
  guardianUserIds: ID[]; consents: Consents; ageGroup: AgeGroupId; weeklyPracticeGoal: number; goals: string[];
  createdAt: ISODateTime;
}
export interface Consents { academyParticipation: boolean; achievementsSharing: "private" | "team" ; photoConsent: boolean; videoReview: boolean; coachFeedbackVisible: boolean; updatedAt: ISODateTime; byUserId: ID; }

export interface Registration {
  id: ID; leagueId: ID; seasonId: ID; playerId: ID; guardianUserId: ID; divisionId: ID; requestedDivisionId?: ID;
  status: "draft" | "submitted" | "waitlisted" | "pending_documents" | "approved" | "assigned" | "withdrawn" | "refunded";
  fee: number; discounts: { label: string; amount: number }[]; amountPaid: number; balance: number;
  paymentStatus: "unpaid" | "partial" | "paid" | "plan" | "assistance_requested" | "assistance_granted" | "refunded";
  requests?: { buddyName?: string; coachName?: string; note?: string };
  documents: { type: string; status: "missing" | "uploaded" | "verified" | "rejected"; assetId?: string; note?: string }[];
  waivers: { id: string; acceptedAt?: ISODateTime }[];
  verification: { residency: "pending" | "verified" | "school" | "waiver" | "rejected"; notes?: string };
  submittedAt?: ISODateTime; updatedAt: ISODateTime; medicalNotes?: string; emergencyContact?: { name: string; phone: string; relation: string };
}
export interface Payment { id: ID; leagueId: ID; registrationId?: ID; userId: ID; amount: number; kind: "registration" | "refund" | "donation" | "sponsorship" | "fundraiser" | "fee" | "umpire_pay" | "expense_reimbursement"; method: "card" | "check" | "cash" | "assistance" | "offline"; status: "pending" | "succeeded" | "failed" | "refunded"; processorRef?: string; createdAt: ISODateTime; note?: string; }
export interface Expense { id: ID; leagueId: ID; category: string; amount: number; vendor: string; date: ISODate; note?: string; }

export interface Field { id: ID; leagueId: ID; name: string; address: string; type: "60ft" | "70ft" | "90ft" | "tee_ball" | "multi"; lights: boolean; status: "open" | "closed" | "under_review" | "delayed"; statusNote?: string; statusUpdatedAt?: ISODateTime; mapHint?: string; }
export interface ScheduleEvent {
  id: ID; leagueId: ID; seasonId: ID; type: "game" | "practice" | "event" | "clinic";
  divisionId?: ID; teamIds: ID[]; homeTeamId?: ID; awayTeamId?: ID; fieldId?: ID;
  start: ISODateTime; end: ISODateTime; status: "scheduled" | "postponed" | "cancelled" | "completed" | "in_progress";
  umpireUserIds: ID[]; title?: string; notes?: string; result?: { homeScore: number; awayScore: number };
  rescheduledFromId?: ID; updatedAt: ISODateTime;
}
export interface Attendance { id: ID; leagueId: ID; eventId: ID; teamId: ID; records: Record<ID, "present" | "absent" | "late" | "excused">; updatedAt: ISODateTime; }
export interface PitchingAppearance { id: ID; leagueId: ID; playerId: ID; teamId: ID; eventId?: ID; date: ISODate; pitches: number; caughtInnings?: number; recordedByUserId: ID; }

export interface Volunteer { id: ID; leagueId: ID; userId: ID; roles: string[]; backgroundCheck: { status: "not_started" | "submitted" | "cleared" | "expired" | "flagged"; expiresAt?: ISODate }; trainingComplete: string[]; availability?: string; }
export interface VolunteerShift { id: ID; leagueId: ID; title: string; kind: "concessions" | "field_prep" | "umpire" | "scorekeeper" | "team_parent" | "event" | "other" | "snack" | "dugout" | "pitch_count"; start: ISODateTime; end: ISODateTime; fieldId?: ID; slots: number; assignedUserIds: ID[]; teamId?: ID; eventId?: ID; note?: string; createdByUserId?: ID; }
export interface Sponsor { id: ID; leagueId: ID; name: string; tier: "platinum" | "gold" | "silver" | "bronze" | "team"; amount: number; contactName: string; contactEmail: string; website?: string; logoText: string; logoAssetId?: string; color: string; teamId?: ID; status: "prospect" | "applied" | "active" | "renewing" | "lapsed"; placements: ("website_home" | "field_banner" | "jersey" | "newsletter" | "scoreboard")[]; since: number; }
export interface Fundraiser { id: ID; leagueId: ID; title: string; kind: "event" | "campaign" | "product"; goal: number; raised: number; date?: ISODate; description: string; status: "planned" | "active" | "complete"; }

export interface Announcement { id: ID; leagueId: ID; title: string; body: string; audience: { scope: "league" | "division" | "team"; id?: ID }; authorUserId: ID; publishedAt: ISODateTime; pinned: boolean; kind: "news" | "alert" | "rainout" | "registration" | "schedule" | "volunteer" | "fundraising"; }
export interface MessageThread { id: ID; leagueId: ID; kind: "team" | "direct" | "division" | "league"; title: string; participantUserIds: ID[]; teamId?: ID; divisionId?: ID; messages: Message[]; updatedAt: ISODateTime; readBy: Record<ID, ISODateTime>; }
export interface Message { id: ID; authorUserId: ID; body: string; sentAt: ISODateTime; attachmentAssetIds?: string[]; }
export interface Notification { id: ID; leagueId: ID; userId: ID; title: string; body: string; kind: string; createdAt: ISODateTime; read: boolean; link?: string; deliverAt?: ISODateTime | null; category?: string; dedupeKey?: string; }

/* ---------- Education & development ---------- */
export interface Lesson {
  id: ID; title: string; category: Category; subcategory: string; ageGroups: AgeGroupId[]; skillLevel: SkillLevel; objective: string; summary: string; video: VideoRef;
  explanation: string[]; parentInstructions: string[]; equipment: Equipment[]; equipmentFreeAlternative: string | null; steps: string[]; durationMin: number;
  commonMistakes: { mistake: string; fix: string }[]; cues: string[]; safety: string[]; progression: { easier: string; harder: string; nextLessonId: string | null }; tags: string[]; drillIds: string[];
  leagueId?: ID; status?: "draft" | "published" | "archived"; authorUserId?: ID; updatedAt?: ISODateTime;
}
export interface Drill {
  id: ID; name: string; category: Category; skillFocus: string[]; ageGroups: AgeGroupId[]; skillLevels: SkillLevel[]; equipmentRequired: Equipment[]; equipmentFreeVariant: string | null;
  locations: Location[]; minSpaceFt: number; participantsMin: number; participantsMax: number; contexts: ("home" | "team")[]; durationMin: number; phase: DrillPhase; intensity: "low" | "medium" | "high";
  throwingLoad: ThrowingLoad; setup: string; instructions: string[]; reps: string; cues: string[]; parentTip: string; safety: string[]; funVariation: string; lessonId: string | null; video?: DrillVideo; diagram?: DrillDiagram;
}
/* ---------- Drill diagrams ---------- */
export type DiagramItemKind = "player" | "coach" | "cone" | "ball" | "bucket" | "tee" | "net" | "glove";
export interface DiagramItem { id: ID; kind: DiagramItemKind; x: number; y: number; label?: string; }
export interface DiagramArrow { id: ID; from: { x: number; y: number }; to: { x: number; y: number }; kind: "throw" | "run" | "move"; }
export interface DrillDiagram { items: DiagramItem[]; arrows: DiagramArrow[]; note?: string; }
export interface DrillDiagramDoc { id: ID; leagueId?: ID; drillId: ID; diagram: DrillDiagram; updatedByUserId: ID; updatedAt: ISODateTime; }
export interface ParentGuide {
  id: ID; title: string; summary: string; category: Category | "general"; ageGroups: AgeGroupId[]; pathwayStep: number | null; durationMin: number; video: VideoRef; intro: string[];
  whatToDo: string[]; whatToSay: string[]; whatToWatchFor: string[]; whatToAvoid: string[]; ifStruggling: string[]; makeItFun: string[]; equipment: Equipment[]; relatedLessonIds: string[]; tags: string[];
}
export interface CoachPlan {
  id: ID; title: string; ageGroups: AgeGroupId[]; durationMin: number; focus: string[]; playersMin: number; playersMax: number; coachesMin: number; equipment: Equipment[]; space: "small" | "half_field" | "full_field" | "indoor"; objective: string;
  blocks: PlanBlock[]; safety: string[]; progressions: string[]; homeAssignmentLessonId: string | null;
}
export interface PlanBlock { title: string; minutes: number; type: "warmup" | "station" | "team" | "game" | "wrapup"; description: string; setup: string; groups: string; coachingPoints: string[]; drillIds?: string[]; }
export type FieldSpot = "P" | "C" | "1B" | "2B" | "SS" | "3B" | "LF" | "CF" | "RF" | "home" | "first" | "second" | "third" | "mound" | "LCgap" | "RCgap" | "shallowLF" | "shallowRF" | "deepCF" | "cutoff1B" | "cutoff3B" | "bunt3B" | "bunt1B";
export interface DiagramSpec { highlight: FieldSpot[]; runners: ("first" | "second" | "third")[]; arrows: { from: FieldSpot; to: FieldSpot; kind: "throw" | "run" | "move" }[]; caption: string; }
export type IQTopic = "positions" | "rules" | "force_plays" | "cutoffs" | "relays" | "defense" | "situations" | "hitting" | "baserunning";
export interface IQLesson { id: ID; title: string; topic: IQTopic; ageGroups: AgeGroupId[]; summary: string; sections: { heading: string; body: string[]; diagram: DiagramSpec | null }[]; keyTakeaways: string[]; questionIds: string[]; }
export interface IQQuestion {
  id: ID; type: "diamond_select" | "multiple_choice" | "true_false" | "position_identify"; topic: IQTopic; lessonId: string; ageGroups: AgeGroupId[]; difficulty: 1 | 2 | 3;
  scenario: { outs: 0 | 1 | 2; runners: ("first" | "second" | "third")[]; youAre: FieldSpot | null; ballTo: FieldSpot | null; ballType: "ground" | "fly" | "line" | "bunt" | null; inning?: string; score?: string } | null;
  prompt: string; assumptions: string | null;
  targets: { spot: FieldSpot; verdict: "correct" | "acceptable" | "wrong"; explanation: string }[] | null;
  options: { id: "a" | "b" | "c" | "d"; text: string; verdict: "correct" | "acceptable" | "wrong"; explanation: string }[] | null;
  explanation: string; animation: { throws: { from: FieldSpot; to: FieldSpot }[]; runs: { from: FieldSpot; to: FieldSpot }[] } | null; tags: string[];
  leagueId?: ID; status?: "draft" | "published" | "archived";
}
export interface Curriculum { id: ID; title: string; level: SkillLevel; ageGroups: AgeGroupId[]; weeksCount: 8 | 12; summary: string; audience: string; weeks: CurriculumWeek[]; leagueId?: ID; status?: "draft" | "published" | "archived"; }
export interface CurriculumWeek { week: number; title: string; focus: string; summary: string; lessonIds: string[]; parentGuideIds: string[]; homePracticeMinutes: number; iqQuestionIds: string[]; challengeId: string | null; coachTip: string; }
export interface Challenge { id: ID; title: string; description: string; rule: { type: "lessons_completed" | "practices_completed" | "iq_correct" | "curriculum_week_completed" | "parent_child_practice" | "lessons_in_category" | "positions_identified" | "sportsmanship_lesson"; target: number; category: Category | null; periodDays: number | null }; badgeId: string; ageGroups: AgeGroupId[]; points: number; }
export interface Badge { id: ID; name: string; description: string; icon: string; tier: "bronze" | "silver" | "gold"; }
export interface Resource { id: ID; title: string; category: string; audience: string[]; summary: string; body: string[]; checklist: string[]; officialLinks: { label: string; url: string }[]; disclaimer: string | null; }
export interface CertQuestion { id: ID; prompt: string; options: string[]; correct: number; explanation: string; }
export interface CertModule { id: ID; title: string; summary: string; durationMin: number; required: boolean; renewMonths: number; audience: Role[]; sections: { heading: string; body: string[] }[]; keyPoints: string[]; resourceIds: ID[]; quiz: CertQuestion[]; }
export interface Certification { id: ID; leagueId: ID; userId: ID; moduleId: ID; completedAt: ISODateTime; expiresAt: ISODate; score: number; passed: boolean; attempts: number; }
export interface DemoGuideStep { id: ID; title: string; route: string; minutes: number; say: string[]; click: string[]; }
export interface TourStep { id: ID; title: string; route: string; explain: string[]; try?: string[]; target?: string; }
export interface TourSection { id: ID; title: string; persona: string; summary: string; steps: TourStep[]; }
export interface TourContent { title: string; intro: string; controls: string[]; sections: TourSection[]; closing: { title: string; lines: string[] }; }
export interface DemoGuide { title: string; intro: string; acts: { id: ID; title: string; persona: string; minutes: number; steps: DemoGuideStep[] }[]; closing: string[]; }
export interface SafetyContent { planSections: { id: ID; title: string; prompt: string; starter: string }[]; kitItems: { id: ID; label: string }[]; incidentTypes: { id: Incident["type"]; label: string; hint: string }[]; }
export interface SeasonCloseContent { tasks: { id: ID; group: string; label: string; hint: string }[]; awardTemplates: string[]; }
export interface SurveyTemplate { id: ID; title: string; audience: Survey["audience"]; questions: SurveyQuestion[]; }
export interface GlossaryTerm { id: ID; term: string; definition: string; example: string; relatedLessonIds: string[]; }

/* ---------- Player development state (tenant-owned, mutable) ---------- */
export interface LessonCompletion { id: ID; leagueId: ID; playerId: ID; lessonId: ID; completedAt: ISODateTime; byUserId: ID; source: "self" | "assignment" | "curriculum" | "practice"; }
export interface PracticePlan {
  id: ID; leagueId: ID; kind: "home" | "team"; title: string; createdByUserId: ID; playerId?: ID; teamId?: ID; createdAt: ISODateTime;
  params: Record<string, string | number | string[]>; blocks: GeneratedBlock[]; totalMinutes: number; safety: string[]; funChallenge: string; recap: string; completedAt?: ISODateTime; timesCompleted: number; favorite?: boolean;
}
export interface GeneratedBlock { phase: DrillPhase | "station" | "team" | "wrapup"; title: string; minutes: number; drillId?: ID; lessonId?: ID; instructions: string[]; cues: string[]; parentTip?: string; reps?: string; safety?: string[]; setup?: string; groups?: string; }
export interface Assignment { id: ID; leagueId: ID; teamId?: ID; playerIds: ID[]; lessonId: ID; practicePlanId?: ID; assignedByUserId: ID; assignedAt: ISODateTime; dueBy?: ISODate; note: string; completions: Record<ID, ISODateTime>; }
export interface IQProgress { id: ID; leagueId: ID; playerId: ID; answers: Record<ID, { correct: boolean; attempts: number; lastAt: ISODateTime; lastChoice: string }>; score: number; streak: number; updatedAt: ISODateTime; }
export interface AchievementAward { id: ID; leagueId: ID; playerId: ID; challengeId: ID; badgeId: ID; awardedAt: ISODateTime; }
export interface CurriculumEnrollment { id: ID; leagueId: ID; playerId: ID; curriculumId: ID; startedAt: ISODate; completedWeeks: number[]; assignedBy: "league" | "guardian" | "coach"; }
export interface PlayerNote { id: ID; leagueId: ID; teamId: ID; playerId: ID; coachUserId: ID; body: string; createdAt: ISODateTime; skillChecklist?: Record<string, "not_yet" | "developing" | "consistent">; }
export interface VideoSubmission { id: ID; leagueId: ID; playerId: ID; guardianUserId: ID; teamId?: ID; skill: Category; note: string; assetId?: string; fileName?: string; sizeBytes?: number; uploadedAt: ISODateTime; status: "pending_review" | "reviewed" | "deleted"; consentConfirmed: boolean; retentionUntil: ISODate; feedback: { id: ID; coachUserId: ID; atSec: number | null; body: string; createdAt: ISODateTime }[]; }
export interface AuditLog { id: ID; leagueId: ID | null; actorUserId: ID; actorViewerId?: string | null; action: string; entity: string; entityId?: ID; at: ISODateTime; detail?: string; }
export interface Favorite { id: ID; leagueId: ID; userId: ID; itemType: "lesson" | "guide" | "drill" | "resource"; itemId: ID; }
export interface Playlist { id: ID; leagueId: ID; userId: ID; title: string; lessonIds: ID[]; createdAt: ISODateTime; }

export interface GuideProgress { id: ID; leagueId: ID; userId: ID; guideId: ID; completedAt: ISODateTime; }
export interface FinancialScenario { id: ID; leagueId: ID; name: string; inputs: { players: number; fee: number; league: number; turf: number; cost: number }; presetId: string | null; createdByUserId: ID; createdAt: ISODateTime; updatedAt: ISODateTime; }


/* ---------- Tryouts, evaluations and the draft ---------- */
export type EvalSkill = "hitting" | "throwing" | "fielding" | "running" | "pitching" | "coachability";
export interface Tryout { id: ID; leagueId: ID; seasonId: ID; divisionId: ID; title: string; date: ISODate; startTime: string; fieldId?: ID; status: "scheduled" | "in_progress" | "complete"; evaluatorUserIds: ID[]; stations: EvalSkill[]; notes?: string; createdByUserId: ID; updatedAt: ISODateTime; }
export interface Evaluation { id: ID; leagueId: ID; tryoutId: ID; playerId: ID; evaluatorUserId: ID; scores: Partial<Record<EvalSkill, number>>; notes: string; updatedAt: ISODateTime; }
export interface DraftPick { round: number; pick: number; overall: number; teamId: ID; playerId: ID; byUserId: ID; at: ISODateTime; auto?: boolean; }
export interface Draft { id: ID; leagueId: ID; seasonId: ID; divisionId: ID; tryoutId?: ID; title: string; status: "setup" | "live" | "complete"; teamOrder: ID[]; rounds: number; picks: DraftPick[]; protectedPlayerIds: Record<ID, ID[]>; rostersApplied?: boolean; startedAt?: ISODateTime; completedAt?: ISODateTime; createdByUserId: ID; updatedAt: ISODateTime; }

/* ---------- All-Stars ---------- */
export interface AllStarPool { id: ID; leagueId: ID; seasonId: ID; divisionId: ID; title: string; ageMin: number; ageMax: number; rosterSize: number; maxNominationsPerTeam: number; maxOwnPlayersOnBallot: number | null; minGames: number; status: "nominating" | "voting" | "selected"; nominationsClose: ISODate; votingClose?: ISODate; selectedPlayerIds: ID[]; alternatePlayerIds: ID[]; managerUserId?: ID; notes?: string; createdByUserId: ID; updatedAt: ISODateTime; selectedAt?: ISODateTime; }
export interface AllStarNomination { id: ID; leagueId: ID; poolId: ID; playerId: ID; teamId: ID; nominatedByUserId: ID; note: string; createdAt: ISODateTime; }
export interface AllStarVote { id: ID; leagueId: ID; poolId: ID; voterUserId: ID; teamId: ID; playerIds: ID[]; updatedAt: ISODateTime; }

/* ---------- Families: carpools and photos ---------- */
export interface Carpool { id: ID; leagueId: ID; teamId: ID; eventId: ID; driverUserId: ID; seats: number; pickupArea: string; note: string; riderPlayerIds: ID[]; createdAt: ISODateTime; updatedAt: ISODateTime; }
export interface Photo { id: ID; leagueId: ID; teamId: ID; assetId: string; caption: string; uploadedByUserId: ID; uploadedAt: ISODateTime; playerIds: ID[]; eventId?: ID; }
/* ---------- Safety ---------- */
export interface Incident { id: ID; leagueId: ID; date: ISODate; time: string; fieldId?: ID; eventId?: ID; type: "injury" | "behavior" | "facility" | "weather" | "other"; severity: "minor" | "moderate" | "serious"; playerIds: ID[]; involved: string; description: string; actionTaken: string; firstAidGiven: boolean; emsCalled: boolean; parentNotified: boolean; reportedByUserId: ID; status: "open" | "reviewed" | "closed"; followUp: string; reviewedByUserId?: ID; createdAt: ISODateTime; updatedAt: ISODateTime; }
export interface SafetyPlan { id: ID; leagueId: ID; sections: Record<string, string>; updatedAt: ISODateTime; updatedByUserId: ID; approvedAt?: ISODate; approvedByUserId?: ID; year: number; }
export interface KitCheck { id: ID; leagueId: ID; fieldId: ID; checkedAt: ISODateTime; byUserId: ID; items: Record<string, boolean>; notes: string; }
/* ---------- Umpires ---------- */
export interface UmpireProfile { id: ID; leagueId: ID; userId: ID; availability: string[]; maxGamesPerWeek: number; divisionsOk: ID[]; notes: string; updatedAt: ISODateTime; }
/* ---------- Season close-out ---------- */
export interface SeasonCloseout { id: ID; leagueId: ID; seasonId: ID; tasks: Record<string, { done: boolean; byUserId: ID; at: ISODateTime }>; awards: { id: ID; teamId: ID; playerId?: ID; title: string }[]; uniformReturns: Record<ID, "returned" | "missing" | "kept">; equipment: { id: ID; item: string; qty: number; condition: "good" | "fair" | "replace" }[]; banquet: { date?: ISODate; location: string; notes: string }; notes: string; updatedAt: ISODateTime; }
/* ---------- Surveys ---------- */
export interface SurveyQuestion { id: ID; type: "rating" | "choice" | "text"; text: string; options?: string[]; }
export interface Survey { id: ID; leagueId: ID; seasonId: ID; templateId: string | null; title: string; audience: "guardian" | "coach" | "all"; questions: SurveyQuestion[]; status: "draft" | "open" | "closed"; opensAt: ISODate; closesAt: ISODate; createdByUserId: ID; createdAt: ISODateTime; }
export interface SurveyResponse { id: ID; leagueId: ID; surveyId: ID; userId: ID; divisionId?: ID; answers: Record<string, number | string>; submittedAt: ISODateTime; }
/* ---------- Forms (evaluations, medical, volunteer applications, feedback) ---------- */
export type FormFieldType = "text" | "long_text" | "number" | "rating" | "choice" | "multi" | "yes_no" | "date" | "signature";
export type FormPurpose = "evaluation" | "medical" | "volunteer" | "feedback" | "other";
export type FormAudience = "guardian" | "coach" | "volunteer" | "staff" | "all";
export interface FormField { id: ID; type: FormFieldType; label: string; required?: boolean; options?: string[]; hint?: string; }
export interface FormTemplate { id: ID; title: string; purpose: FormPurpose; audience: FormAudience; perPlayer: boolean; description: string; fields: FormField[]; }
export interface LeagueForm { id: ID; leagueId: ID; seasonId: ID; templateId: string | null; title: string; purpose: FormPurpose; audience: FormAudience; perPlayer: boolean; description: string; fields: FormField[]; status: "draft" | "open" | "closed"; opensAt: ISODate; closesAt: ISODate; createdByUserId: ID; createdAt: ISODateTime; }
export type FormAnswer = string | number | boolean | string[];
export interface FormResponse { id: ID; leagueId: ID; formId: ID; userId: ID; playerId?: ID; teamId?: ID; answers: Record<string, FormAnswer>; submittedAt: ISODateTime; reviewedByUserId?: ID; reviewedAt?: ISODateTime; reviewNote?: string; }
/* ---------- Payment plans ---------- */
export interface Installment { id: ID; dueDate: ISODate; amount: number; paidAt?: ISODateTime; paymentId?: ID; }
export interface PaymentPlan { id: ID; leagueId: ID; registrationId: ID; userId: ID; total: number; installments: Installment[]; status: "active" | "complete" | "cancelled"; createdAt: ISODateTime; createdByUserId: ID; lastReminderAt?: ISODateTime; }
/* ---------- Tournaments ---------- */
export type TournamentFormat = "round_robin" | "single_elim" | "double_elim" | "pools_bracket";
export interface TournamentPool { id: ID; name: string; teamIds: ID[]; }
export interface TournamentMatch { id: ID; stage: "pool" | "winners" | "losers" | "final"; round: number; slot: number; poolId?: ID; homeTeamId: ID | null; awayTeamId: ID | null; homeFrom?: { matchId: ID; take: "winner" | "loser" } | { seed: number } | { poolId: ID; place: number }; awayFrom?: { matchId: ID; take: "winner" | "loser" } | { seed: number } | { poolId: ID; place: number }; eventId?: ID; homeScore?: number; awayScore?: number; winnerTeamId?: ID; loserTeamId?: ID; bye?: boolean; }
export interface Tournament { id: ID; leagueId: ID; seasonId: ID; divisionId: ID; name: string; format: TournamentFormat; teamIds: ID[]; seeds: ID[]; pools: TournamentPool[]; matches: TournamentMatch[]; status: "setup" | "live" | "complete"; championTeamId?: ID; runnerUpTeamId?: ID; startDate: ISODate; fieldId?: ID; createdByUserId: ID; createdAt: ISODateTime; updatedAt: ISODateTime; }
/* ---------- Curriculum assignment ---------- */
export interface TeamCurriculum { id: ID; leagueId: ID; teamId: ID; seasonId: ID; curriculumId: ID; startDate: ISODate; assignedByUserId: ID; createdAt: ISODateTime; }
/* ---------- Budget ---------- */
export interface Budget { id: ID; leagueId: ID; seasonId: ID; lines: { id: ID; kind: "revenue" | "expense"; category: string; planned: number }[]; updatedAt: ISODateTime; }
/* ---------- Content versions ---------- */
export interface ContentVersion { id: ID; leagueId: ID; entityType: "lesson" | "iqQuestion" | "curriculum"; entityId: ID; snapshot: unknown; savedByUserId: ID; savedAt: ISODateTime; note: string; }

/* ---------- Report cards ---------- */
export type SkillRating = 1 | 2 | 3; // 1 not yet · 2 developing · 3 consistent
export interface ReportCard { id: ID; leagueId: ID; teamId: ID; playerId: ID; seasonId: ID; coachUserId: ID; period: "mid" | "end"; ratings: Record<string, SkillRating>; strengths: string; focus: string; focusSkillId: string | null; recommendedLessonIds: ID[]; coachNote: string; status: "draft" | "published"; createdAt: ISODateTime; updatedAt: ISODateTime; publishedAt?: ISODateTime; parentAcknowledgedAt?: ISODateTime; }

/* ---------- Game day ---------- */
export interface LineupPlan { order: ID[]; positions: Record<ID, string[]>; absent: ID[]; updatedAt: ISODateTime; byUserId: ID; }
export interface PitcherLine { playerId: ID; pitches: number; }
export interface GameSheet { id: ID; leagueId: ID; eventId: ID; status: "pre" | "live" | "final"; innings: { top: number | null; bottom: number | null }[]; current: { inning: number; half: "top" | "bottom"; outs: number }; lineups: Record<ID, LineupPlan>; pitchers: Record<ID, PitcherLine[]>; keeperUserId?: ID; notes?: string; updatedAt: ISODateTime; finalizedAt?: ISODateTime; }

/* ---------- Platform ---------- */
export interface SubscriptionPlan { id: ID; name: string; monthlyPrice: number; annualPrice: number; description: string; features: string[]; limits: { players: number | null; teams: number | null; admins: number | null }; trialDays: number; featured?: boolean; }
export interface SiteContent {
  leagueId: ID; hero: { headline: string; subheadline: string; ctaLabel: string; ctaRoute: string; bannerText?: string; bannerActive: boolean };
  about: string[]; faq: { q: string; a: string }[]; policies: { title: string; body: string }[]; documents: { title: string; description: string; assetId?: string }[];
  boardMembers: { name: string; title: string; email?: string }[]; contact: { email: string; phone?: string; mailing?: string }; sectionsOrder: string[]; galleryNote: string; updatedAt: ISODateTime; updatedByUserId?: ID;
}

/* ---------- Content bundle ---------- */
export interface ContentBundle {
  lessons: Lesson[]; drills: Drill[]; parentGuides: ParentGuide[]; coachPlans: CoachPlan[]; iqLessons: IQLesson[]; iqQuestions: IQQuestion[];
  curricula: Curriculum[]; challenges: Challenge[]; badges: Badge[]; resources: Resource[]; glossary: GlossaryTerm[]; drillVideos: DrillVideo[];
  certModules: CertModule[]; certPassingPct: number; demoGuide: DemoGuide | null; tour: TourContent | null; formTemplates: FormTemplate[]; safety: SafetyContent; seasonClose: SeasonCloseContent; surveyTemplates: SurveyTemplate[];
  manifest: { ageGroups: { id: AgeGroupId; label: string; min: number; max: number }[] };
}
export interface DemoBundle {
  leagues: League[]; users: User[]; memberships: Membership[]; seasons: Season[]; divisions: Division[]; teams: Team[]; players: Player[]; registrations: Registration[]; payments: Payment[]; expenses: Expense[];
  fields: Field[]; events: ScheduleEvent[]; attendance: Attendance[]; pitching: PitchingAppearance[]; volunteers: Volunteer[]; shifts: VolunteerShift[]; sponsors: Sponsor[]; fundraisers: Fundraiser[]; announcements: Announcement[]; threads: MessageThread[];
  completions: LessonCompletion[]; assignments: Assignment[]; iqProgress: IQProgress[]; awards: AchievementAward[]; enrollments: CurriculumEnrollment[]; notes: PlayerNote[]; practicePlans: PracticePlan[]; videos: VideoSubmission[]; plans: SubscriptionPlan[]; siteContent: SiteContent[]; personas: Persona[];
  tryouts?: Tryout[]; evaluations?: Evaluation[]; drafts?: Draft[]; reportCards?: ReportCard[]; gameSheets?: GameSheet[]; certifications?: Certification[]; allStarPools?: AllStarPool[]; allStarNominations?: AllStarNomination[]; allStarVotes?: AllStarVote[]; carpools?: Carpool[]; photos?: Photo[]; incidents?: Incident[]; safetyPlans?: SafetyPlan[]; kitChecks?: KitCheck[]; umpireProfiles?: UmpireProfile[]; closeouts?: SeasonCloseout[]; surveys?: Survey[]; surveyResponses?: SurveyResponse[]; budgets?: Budget[]; contentVersions?: ContentVersion[]; forms?: LeagueForm[]; formResponses?: FormResponse[]; paymentPlans?: PaymentPlan[]; tournaments?: Tournament[]; teamCurricula?: TeamCurriculum[]; drillDiagrams?: DrillDiagramDoc[]; meta?: { seededOn?: string; shiftedTo?: string; shiftedDays?: number };
}
export interface Persona { id: ID; userId: ID; leagueId: ID | null; label: string; role: Role; description: string; playerId?: ID; teamId?: ID; }
