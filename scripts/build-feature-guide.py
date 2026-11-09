# Usage: python3 scripts/build-feature-guide.py docs/GamePlanIQ-Feature-Guide.pdf dist/assets/gameplaniq-logo.png  (needs reportlab)
"""GamePlanIQ feature guide: one row per feature, grouped by section, written to hand out with the demo."""
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image

OUT = sys.argv[1]
LOGO = sys.argv[2] if len(sys.argv) > 2 else None
NAVY = colors.HexColor("#0B1A30"); BLUE = colors.HexColor("#0D5BD9"); MUTED = colors.HexColor("#4A5A70"); LINE = colors.HexColor("#D5DCE6"); SOFT = colors.HexColor("#F2F5F9"); BLUESOFT = colors.HexColor("#E4ECFB")
DEMO = "https://claude.ai/artifact/K8t2w35433THXNjagfhfqF"

title = ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=24, leading=28, textColor=NAVY)
sub = ParagraphStyle("s", fontName="Helvetica", fontSize=11, leading=15, textColor=MUTED)
h1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=NAVY, spaceBefore=10, spaceAfter=2)
who = ParagraphStyle("who", fontName="Helvetica-Oblique", fontSize=9, leading=12, textColor=MUTED, spaceAfter=5)
h2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=BLUE, spaceBefore=6, spaceAfter=3)
cell = ParagraphStyle("c", fontName="Helvetica", fontSize=8.6, leading=11, textColor=NAVY)
cellb = ParagraphStyle("cb", parent=cell, fontName="Helvetica-Bold")
head = ParagraphStyle("hd", parent=cell, fontName="Helvetica-Bold", textColor=colors.white, fontSize=8)
body = ParagraphStyle("b", fontName="Helvetica", fontSize=9.5, leading=13, textColor=NAVY)
bullet = ParagraphStyle("bl", parent=body, leftIndent=12, bulletIndent=2, spaceAfter=2)

W = letter[0] - 1.2 * inch
COLS = [1.45 * inch, (W - 1.45 * inch) * 0.55, (W - 1.45 * inch) * 0.45]

def table(rows):
    data = [[Paragraph("Feature", head), Paragraph("What it does", head), Paragraph("Why it helps", head)]]
    for name, what, why in rows:
        data.append([Paragraph(name, cellb), Paragraph(what, cell), Paragraph(why, cell)])
    t = Table(data, colWidths=COLS, repeatRows=1)
    style = [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
             ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5)]
    for i in range(1, len(data)):
        if i % 2 == 0: style.append(("BACKGROUND", (0, i), (-1, i), SOFT))
    t.setStyle(TableStyle(style)); return t

def section(name, for_whom, groups):
    out = [Paragraph(name, h1), Paragraph(for_whom, who)]
    for g, rows in groups:
        heading = [Paragraph(g, h2)] if g else []
        out.append(KeepTogether(heading + [table(rows)]) if len(rows) <= 6 else KeepTogether(heading + [Spacer(0, 0)]))
        if len(rows) > 6: out.append(table(rows))
    return out

story = []
if LOGO:
    img = Image(LOGO); ratio = img.imageHeight / img.imageWidth; img.drawWidth = 1.7 * inch; img.drawHeight = 1.7 * inch * ratio; img.hAlign = "LEFT"; story += [img, Spacer(1, 8)]
story += [Paragraph("What GamePlanIQ does", title), Spacer(1, 4),
          Paragraph("A Little League operating system: one app for the league office, the coaches, the families and the kids. This guide lists every feature by section, what it does, and why it helps.", sub), Spacer(1, 10)]
intro = Table([[Paragraph("<b>Try the demo:</b> " + DEMO, body)],
               [Paragraph("Click <b>Go into demo mode</b>. A guided tour walks through every screen and says what to click. <b>Skip this section</b> jumps ahead; <b>Hide</b> lets you explore. Or pick a role on the welcome page: Parent, Player, Head Coach, Assistant Coach, League President, Treasurer, Minor Commissioner, Umpire, Volunteer or Platform Admin. All data is fictional and can be reset.", body)],
               [Paragraph("<b>Fits with Little League:</b> registration and fees stay in Little League Central Registration (Sports Connect today, PlayMetrics next). Import the roster; run everything else here.", body)]], colWidths=[W])
intro.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BLUESOFT), ("BOX", (0, 0), (-1, -1), 0.6, BLUE), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
story += [intro]

story += section("Families", "For parents and guardians, including the ones who never played.", [
 (None, [
  ("Home and daily digest", "Today's field status, the next game or practice, duties, forms and report cards in one place; switch to the week ahead.", "One glance replaces a dozen emails and group texts."),
  ("Team page", "Roster, schedule, results, documents, duties, carpools and photos for the child's team.", "Everything about the team lives in one shared place."),
  ("Game-day duties", "Claim snacks, scorekeeper, dugout parent or pitch counter in one tap; reminder the day before.", "No paper sign-up sheets; coaches see coverage at once."),
  ("Carpools", "Offer seats to a game; parents add only their own child; the driver is told who is riding.", "Rides are organized without a group chat."),
  ("Photo albums", "Team-only albums; tagged players need photo consent; withdrawn consent hides their photos.", "Families share moments without privacy worries."),
  ("Family calendar", "One calendar file for every child's games, practices, duties and deadlines, with reminders.", "Reaches families who never open an app."),
  ("Notifications", "Every notice in one center; each person picks topics and quiet hours; rainouts always get through.", "The right people hear the right thing, without overload."),
  ("Messages", "Team threads and messages with the coach; no phone numbers exchanged; player accounts cannot message.", "Safer communication with a record of what was said."),
  ("Report cards", "Ten skills, three strengths, one focus, and lessons chosen for that focus; private to the family.", "Parents know exactly how to help at home."),
  ("Forms", "Medical information, consents and anything else the league asks, once per child, from a phone.", "No paper forms; medical answers reach only the coach, safety officer and president."),
  ("Registration", "Five steps on a phone: child, division, forms, payment, review. Age and eligibility are checked as you go.", "Fewer mistakes and no forms sent back."),
  ("Payment plans", "Split fees into two to six monthly installments, with reminders before each one.", "Cost is less of a barrier to playing."),
  ("Player history and recap", "A timeline of seasons, positions, attendance, report cards and badges; a printable season recap.", "The whole story follows the child from T-ball up."),
  ("Tournament bracket", "Follow the end-of-season bracket; winners move on automatically from the scorebook.", "Families always know who plays next."),
  ("Surveys", "Two-minute surveys; the board sees totals and anonymous comments only.", "Honest feedback the league can act on."),
 ])])

story += section("Players and development", "For kids and the adults helping them practice.", [
 (None, [
  ("Player Academy", "Lessons by skill and age, each with a verified drill video, parent instructions and a short backyard practice.", "Kids improve between practices, not only at them."),
  ("Parent Academy", "Plain-language guides: equipment, rules by division, pitch counts, handling a bad game.", "Parents who never played can still coach at home."),
  ("Practice generator", "Pick a skill and the minutes available; get a warm-up, drills and a fun challenge for that age.", "A good ten-minute practice in seconds."),
  ("Baseball IQ", "Situation questions on a diamond: tap where the ball goes; every answer is explained.", "Builds game sense kids rarely get taught."),
  ("Badges and challenges", "Earned for lessons, practices and quizzes; about effort, never statistics; no leaderboards.", "Motivates without comparing kids."),
  ("Player account", "A child's own dashboard with no messaging and no comparison to teammates.", "Kids engage safely under a parent's account."),
 ])])

story += section("Coaches", "For volunteer head and assistant coaches.", [
 (None, [
  ("Coaches' Headquarters", "Teams, practice planner, game day, certification, tryouts and All-Star ballots on one page.", "A volunteer finds everything without training."),
  ("Game plan (private)", "Plan each inning on the familiar sheet: 3B, SS, 2B, 1B, LF, CF, RF, C, Pitcher, Relief, Roster. Flags a kid placed twice, pitcher rest and minimum innings. Only the head coach sees it unless shared; prints a dugout card; sends to the lineup card.", "Lineup decisions are made calmly before game day, privately."),
  ("Game day", "Lineup card checks minimum play and pitcher rest; one-thumb scorebook with pitch counts; Final updates standings.", "No clipboard math in the dugout; rules are kept automatically."),
  ("Pitch counts and rest", "Pitches from the scorebook turn into required rest days by age; resting pitchers are flagged.", "Protects young arms and keeps the league compliant."),
  ("Practice planner and runner", "Builds a practice from the drill library, then runs it full screen with a timer, cues, diagram, video and attendance.", "A first-year coach runs an organized practice."),
  ("Season curriculum", "Assign a weekly program; the team sees this week's focus and which weeks were actually run.", "Skills build in order across the season."),
  ("Drill diagrams", "Players, cones and equipment drawn on a field with throw and run arrows, shown with each drill.", "Coaches set up a drill right the first time."),
  ("Team tools", "Roster notes, attendance, home practice assignments, report cards and evaluations.", "One place for what a coach tracks all season."),
  ("Tryouts and All-Stars", "Score players one to five at six stations on a phone; nominate and vote for All-Stars.", "Fair, documented decisions instead of memory."),
  ("Certification", "Six short safety and conduct modules with a quiz each; renewals tracked.", "Every adult around kids is trained and on record."),
  ("Incident reports", "Report an injury or problem from the field in a minute; the safety officer reviews it.", "Nothing gets lost between the field and the board."),
 ])])

story += section("League office", "For the president, board, commissioners and other volunteers who run the league.", [
 ("Registration and rosters", [
  ("Registration review", "Every registration with documents, payment status and eligibility; approve, waitlist or ask for a fix.", "Registrars work one list instead of spreadsheets."),
  ("Central Registration import", "Paste a Sports Connect or PlayMetrics export; every row is checked and previewed before saving.", "Works with Little League's required system, not against it."),
  ("Teams and Form teams", "Create teams and assign coaches. For divisions without a draft, Form teams keeps siblings together, honors buddy and coach requests and balances strength.", "Fair teams in minutes, with requests handled."),
  ("Tryouts, draft and All-Stars", "Tryout scores feed a snake draft with balance warnings; All-Star ballots are tallied privately.", "Transparent selection that families trust."),
 ]),
 ("Schedule, fields and umpires", [
  ("Scheduling", "Drag games to another day; field, team, coach and umpire conflicts are flagged.", "Schedules without double-bookings."),
  ("Rainout tool and field status", "Close a field, move or cancel its games and tell every family in one step.", "Weather calls take one minute, not an evening of texts."),
  ("Umpires", "Assign by availability with conflict hints; set pay by division; record payments.", "Every game covered and every umpire paid correctly."),
  ("Tournaments", "Round robin, single or double elimination, or pools then a bracket; games land on calendars.", "The end-of-season tournament runs itself."),
 ]),
 ("Volunteers and safety", [
  ("Volunteers", "Shifts, background checks and coach certification in one view, with reminders.", "Compliance is visible before it becomes a problem."),
  ("Safety", "Incident reviews, a safety plan builder with starter text, and first-aid kit checks per field.", "Ready for the yearly Little League safety plan."),
 ]),
 ("Money", [
  ("Finances", "Revenue, expenses, refunds, financial assistance and budget versus actual by category.", "The treasurer reports to the board in minutes."),
  ("Payment plans", "See every installment plan and what is overdue; send reminders in one click.", "Fees get collected without awkward chasing."),
  ("Fundraising ledger", "Every dollar in or out is one line: campaign, fund, cash or check, and its bank deposit. Totals come from the ledger. A banner confirms every dollar is accounted for, or names what is open.", "Volunteers handle cash with a clear trail; the board can prove where every dollar went."),
  ("Sponsors", "Sponsors, levels, logos and what was promised; commitments checked against money received.", "Sponsors get what they paid for and renew."),
  ("Field improvement calculator", "Board-ready estimates for turf and field projects, with a printable summary.", "Big decisions start from real numbers."),
 ]),
 ("Communication, content and records", [
  ("Communications", "Announcements to the right audience; published rules decide who hears what and when.", "Fewer missed messages and fewer complaints."),
  ("Public website", "Edit the headline, documents and board page, then publish. No rosters or kids' names are ever public.", "A current website without a web volunteer."),
  ("Forms and evaluations", "Build any form from templates: evaluations, medical, volunteer applications, feedback, requests.", "Replaces paper and scattered online forms."),
  ("Academy content", "Adjust lessons, videos, diagrams and curricula for the league, with version history and undo.", "Teach the league's own way of playing."),
  ("Surveys and reports", "Season surveys with year-over-year results; reports and an audit log for the board.", "Decisions backed by data, with a record of who changed what."),
  ("Board overview link", "A read-only summary for sponsors and officials, with no player names.", "Share progress safely outside the board."),
  ("Season close-out", "Awards with an engraving list, uniform returns, inventory, banquet, archive; roll over to next season.", "Nothing is forgotten between seasons."),
  ("Staff and permissions", "Each role gets exactly the access it needs, checked on every action.", "Volunteers see only what they should."),
 ]),
])

story += section("Platform", "For whoever hosts GamePlanIQ for one or many leagues.", [
 (None, [
  ("Onboard a league", "A short wizard: name, colors, season, divisions, teams and fields; ends on a working league office.", "A new league is running in about fifteen minutes."),
  ("Separate leagues", "Each league's data is kept apart; a new league starts empty.", "Leagues can share a platform without sharing data."),
  ("Plans and health", "Subscriptions, platform-wide content and system status.", "One operator can support many leagues."),
 ])])

privacy = [Paragraph("Privacy by design", h1), Spacer(1, 2)]
for b in ["Permissions are enforced on every action, not just hidden in menus.",
          "No player names or rosters on public pages. Photo and video use follow each family's consent.",
          "Report cards, medical answers, evaluations and coaches' game plans stay with the people who need them.",
          "At deployment: card payments, email and text messages, and an installable phone app connect. In the demo, the in-app record and the family calendar already work."]:
    privacy.append(Paragraph(b, bullet, bulletText="•"))
story.append(KeepTogether(privacy))

def footer(c, d):
    c.saveState(); c.setFont("Helvetica", 7.5); c.setFillColor(MUTED)
    c.drawString(0.6 * inch, 0.45 * inch, "GamePlanIQ feature guide · demo data is fictional")
    c.drawRightString(letter[0] - 0.6 * inch, 0.45 * inch, f"Page {d.page}"); c.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=letter, leftMargin=0.6 * inch, rightMargin=0.6 * inch, topMargin=0.5 * inch, bottomMargin=0.6 * inch, title="GamePlanIQ feature guide", author="GamePlanIQ", subject="Features by section: what they do and why they help")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("wrote", OUT)
