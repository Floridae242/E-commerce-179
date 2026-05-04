"""
generate_docs.py
Produces register_documentation.pdf in the same directory.
Sections:  1) GenAI Prompts   2) Contract Table   3) Architecture Diagram
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.graphics.shapes import (
    Drawing, Rect, String, Line, Polygon, Group
)
from reportlab.graphics import renderPDF
from reportlab.platypus.flowables import Flowable
import os

# ── Output path ────────────────────────────────────────────────────────────
OUT = os.path.join(os.path.dirname(__file__), "register_documentation.pdf")

# ── Colour palette ─────────────────────────────────────────────────────────
INK      = colors.HexColor("#111110")
PAPER    = colors.HexColor("#f3eee5")
CRIMSON  = colors.HexColor("#c8351f")
ACID     = colors.HexColor("#d6ff3d")
SLATE    = colors.HexColor("#2a1f3d")
LIGHT_BG = colors.HexColor("#f8f4ed")
RULE     = colors.HexColor("#cccccc")
GREEN    = colors.HexColor("#15803d")
AMBER    = colors.HexColor("#b45309")
BLUE     = colors.HexColor("#1d4ed8")
WHITE    = colors.white

# ── Styles ─────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def make_style(name, parent="Normal", **kw):
    return ParagraphStyle(name, parent=styles[parent], **kw)

S = {
    "cover_title": make_style("cover_title", "Title",
        fontSize=32, textColor=WHITE, leading=38, spaceAfter=6,
        fontName="Helvetica-Bold"),
    "cover_sub": make_style("cover_sub", "Normal",
        fontSize=13, textColor=colors.HexColor("#f3eee5"),
        leading=18, fontName="Helvetica"),
    "section_num": make_style("section_num", "Normal",
        fontSize=9, textColor=CRIMSON, fontName="Helvetica-Bold",
        letterSpacing=2, spaceAfter=2),
    "section_title": make_style("section_title", "Heading1",
        fontSize=20, textColor=INK, fontName="Helvetica-Bold",
        spaceBefore=18, spaceAfter=8, leading=24),
    "sub_title": make_style("sub_title", "Heading2",
        fontSize=13, textColor=INK, fontName="Helvetica-Bold",
        spaceBefore=14, spaceAfter=6, leading=16),
    "body": make_style("body", "Normal",
        fontSize=10, textColor=INK, leading=16, spaceAfter=6,
        fontName="Helvetica", alignment=TA_JUSTIFY),
    "prompt_label": make_style("prompt_label", "Normal",
        fontSize=8, textColor=CRIMSON, fontName="Helvetica-Bold",
        letterSpacing=1.5, spaceAfter=4),
    "prompt_body": make_style("prompt_body", "Normal",
        fontSize=10, textColor=colors.HexColor("#1a1a1a"),
        leading=15, fontName="Helvetica", backColor=LIGHT_BG,
        borderPadding=(8, 10, 8, 10), spaceAfter=4),
    "code": make_style("code", "Code",
        fontSize=8.5, textColor=colors.HexColor("#1a1a1a"),
        leading=13, fontName="Courier",
        backColor=colors.HexColor("#f0ebe2"),
        borderPadding=(6, 8, 6, 8)),
    "caption": make_style("caption", "Normal",
        fontSize=8, textColor=colors.HexColor("#555555"),
        fontName="Helvetica-Oblique", alignment=TA_CENTER, spaceAfter=2),
    "note": make_style("note", "Normal",
        fontSize=9, textColor=AMBER, fontName="Helvetica-Oblique",
        leading=13, spaceAfter=4),
    "footer": make_style("footer", "Normal",
        fontSize=8, textColor=colors.HexColor("#888888"),
        fontName="Helvetica", alignment=TA_CENTER),
}


# ── Custom flowable: horizontal coloured rule ──────────────────────────────
class ColorRule(Flowable):
    def __init__(self, color=CRIMSON, thickness=2, width=None):
        Flowable.__init__(self)
        self.color = color
        self.thickness = thickness
        self._width = width

    def wrap(self, availWidth, availHeight):
        self.width = self._width or availWidth
        self.height = self.thickness + 4
        return self.width, self.height

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 2, self.width, self.thickness, stroke=0, fill=1)


# ── Custom flowable: cover page ────────────────────────────────────────────
class CoverPage(Flowable):
    def wrap(self, aw, ah):
        self.aw, self.ah = aw, ah
        return aw, ah

    def draw(self):
        c = self.canv
        w, h = self.aw, self.ah

        # Dark background panel
        c.setFillColor(SLATE)
        c.rect(0, h * 0.38, w, h * 0.62, stroke=0, fill=1)

        # Crimson accent strip
        c.setFillColor(CRIMSON)
        c.rect(0, h * 0.38 - 6, w, 6, stroke=0, fill=1)

        # Acid dot decoration
        c.setFillColor(ACID)
        c.circle(w - 50, h - 50, 30, stroke=0, fill=1)
        c.setFillColor(CRIMSON)
        c.circle(w - 50, h - 50, 18, stroke=0, fill=1)

        # Title area — white text
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 36)
        c.drawString(40, h * 0.38 + h * 0.62 - 80, "Register API")
        c.setFont("Helvetica-Bold", 26)
        c.setFillColor(ACID)
        c.drawString(40, h * 0.38 + h * 0.62 - 120, "Documentation")

        c.setFillColor(colors.HexColor("#c8c0d8"))
        c.setFont("Helvetica", 11)
        lines = [
            "POST /api/register — Stylish E-commerce Platform",
            "Controller · Route · Service Pattern",
            "Node.js · Express · bcrypt · jsonwebtoken",
        ]
        y = h * 0.38 + h * 0.62 - 160
        for line in lines:
            c.drawString(40, y, line)
            y -= 18

        # Bottom info band
        c.setFillColor(PAPER)
        c.rect(0, 0, w, h * 0.38, stroke=0, fill=1)

        # Info grid
        c.setFillColor(INK)
        info = [
            ("Project",   "Stylish Shoes Online Store"),
            ("Module",    "Authentication — Registration"),
            ("Stack",     "Node.js 22 · Express 4 · bcrypt 6 · JWT 9"),
            ("Data",      "data/json/users.json  (10 seed users + live writes)"),
            ("Date",      "May 2026"),
        ]
        y = h * 0.38 - 32
        for label, value in info:
            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(CRIMSON)
            c.drawString(40, y, label.upper())
            c.setFont("Helvetica", 9)
            c.setFillColor(INK)
            c.drawString(120, y, value)
            y -= 18

        # Border
        c.setStrokeColor(RULE)
        c.setLineWidth(0.5)
        c.rect(20, 20, w - 40, h - 40, stroke=1, fill=0)


# ── Custom flowable: dark-background UML sequence diagram ─────────────────
# Matches the dark-background style from course materials:
#   dark #0d1117 bg · grey dashed lifelines · gold numbered circles
#   alt combined-fragment boxes · dashed return arrows · self-loop arrows
# ─────────────────────────────────────────────────────────────────────────
BG_DARK   = colors.HexColor("#0d1117")
BG_ACTOR  = colors.HexColor("#21262d")
BG_HEADER = colors.HexColor("#30363d")
C_GOLD    = colors.HexColor("#e3b341")
C_BLUE_D  = colors.HexColor("#58a6ff")
C_DASHED  = colors.HexColor("#8b949e")
C_GREEN_D = colors.HexColor("#3fb950")
C_RED_D   = colors.HexColor("#f85149")
C_GREY_D  = colors.HexColor("#8b949e")


class RegisterSequenceDiagram(Flowable):
    """
    Dark-background UML sequence diagram for POST /api/register.
    Actors: Client (Browser) | Router | Gatekeeper | Reg. Service | users.json
    Shows: validation alt-frame (400), duplicate alt-frame (409), success (201).
    """
    W = 520
    H = 700

    def wrap(self, aw, ah): return self.W, self.H

    def draw(self):
        c = self.canv
        W, H = self.W, self.H

        # ── Background ──────────────────────────────────────────────────────
        c.setFillColor(BG_DARK)
        c.rect(0, 0, W, H, stroke=0, fill=1)

        # ── Actors ──────────────────────────────────────────────────────────
        actors = [
            "Client\n(Browser)",
            "Express\nRouter",
            "Gatekeeper\n(Middleware)",
            "Register\nService",
            "users.json",
        ]
        n = len(actors)
        ACTOR_W = 80
        ACTOR_H = 34
        xs = [W * (i + 0.5) / n for i in range(n)]

        TOP_Y    = H - ACTOR_H - 10
        BOT_Y    = 10
        LIFE_TOP = TOP_Y
        LIFE_BOT = BOT_Y + ACTOR_H

        # ── Dashed lifelines ────────────────────────────────────────────────
        c.setStrokeColor(C_GREY_D); c.setLineWidth(0.6); c.setDash(4, 4)
        for x in xs:
            c.line(x, LIFE_TOP, x, LIFE_BOT)
        c.setDash()

        # ── Actor box helper ─────────────────────────────────────────────────
        def actor_box(x, y, label):
            bx = x - ACTOR_W/2; by = y
            c.setFillColor(BG_ACTOR)
            c.setStrokeColor(C_GREY_D); c.setLineWidth(0.8)
            c.rect(bx, by, ACTOR_W, ACTOR_H, stroke=1, fill=1)
            lines = label.split("\n")
            c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 7.5)
            if len(lines) == 1:
                c.drawCentredString(x, by + ACTOR_H/2 - 3, lines[0])
            else:
                c.drawCentredString(x, by + ACTOR_H/2 + 3, lines[0])
                c.setFont("Helvetica", 6.5)
                c.drawCentredString(x, by + ACTOR_H/2 - 8, lines[1])

        for x, lbl in zip(xs, actors):
            actor_box(x, TOP_Y, lbl)

        # ── Section bar ──────────────────────────────────────────────────────
        def section_bar(y, text):
            c.setFillColor(BG_HEADER)
            c.rect(4, y-9, W-8, 18, stroke=0, fill=1)
            c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 8)
            c.drawString(12, y-4, text)

        # ── Arrow helpers ────────────────────────────────────────────────────
        step_num = [0]

        def solid_arrow(x1, x2, y, label, col=C_BLUE_D):
            step_num[0] += 1
            n_str = str(step_num[0])
            direction = 1 if x2 > x1 else -1
            c.setStrokeColor(col); c.setLineWidth(1.2); c.setDash()
            c.line(x1, y, x2 - direction*6, y)
            tip = x2 - direction*1
            pts = [tip, y, tip-direction*8, y+4, tip-direction*8, y-4]
            p = c.beginPath()
            p.moveTo(pts[0], pts[1]); p.lineTo(pts[2], pts[3])
            p.lineTo(pts[4], pts[5]); p.close()
            c.setFillColor(col); c.drawPath(p, stroke=0, fill=1)
            mid = (x1+x2)/2
            c.setFont("Helvetica", 7); c.setFillColor(colors.white)
            c.drawCentredString(mid, y+5, label)
            # gold numbered circle
            cx_n = x1 + direction*16
            c.setFillColor(C_GOLD); c.circle(cx_n, y, 6, stroke=0, fill=1)
            c.setFillColor(BG_DARK); c.setFont("Helvetica-Bold", 6)
            c.drawCentredString(cx_n, y-2, n_str)

        def dashed_arrow(x1, x2, y, label, col=C_DASHED):
            direction = 1 if x2 > x1 else -1
            c.setStrokeColor(col); c.setLineWidth(0.9); c.setDash(4, 3)
            c.line(x1, y, x2 - direction*6, y); c.setDash()
            tip = x2 - direction*1
            pts = [tip, y, tip-direction*7, y+3.5, tip-direction*7, y-3.5]
            p = c.beginPath()
            p.moveTo(pts[0], pts[1]); p.lineTo(pts[2], pts[3])
            p.lineTo(pts[4], pts[5]); p.close()
            c.setFillColor(col); c.drawPath(p, stroke=0, fill=1)
            mid = (x1+x2)/2
            c.setFont("Helvetica", 7); c.setFillColor(col)
            c.drawCentredString(mid, y+5, label)

        def self_loop(x, y, label, col=C_BLUE_D):
            step_num[0] += 1
            n_str = str(step_num[0])
            lw = 36; lh = 18
            c.setStrokeColor(col); c.setLineWidth(1.2); c.setDash()
            c.line(x, y, x+lw, y)
            c.line(x+lw, y, x+lw, y-lh)
            c.line(x+lw, y-lh, x+6, y-lh)
            pts = [x+6, y-lh, x+14, y-lh+4, x+14, y-lh-4]
            p = c.beginPath()
            p.moveTo(pts[0], pts[1]); p.lineTo(pts[2], pts[3])
            p.lineTo(pts[4], pts[5]); p.close()
            c.setFillColor(col); c.drawPath(p, stroke=0, fill=1)
            c.setFont("Helvetica", 7); c.setFillColor(colors.white)
            c.drawString(x+lw+3, y-lh/2-3, label)
            c.setFillColor(C_GOLD); c.circle(x+lw-4, y, 6, stroke=0, fill=1)
            c.setFillColor(BG_DARK); c.setFont("Helvetica-Bold", 6)
            c.drawCentredString(x+lw-4, y-2, n_str)

        def alt_frame(x1, y_top, x2, y_bot, condition):
            c.setStrokeColor(C_GREY_D); c.setLineWidth(0.7); c.setDash(3, 3)
            c.rect(x1, y_bot, x2-x1, y_top-y_bot, stroke=1, fill=0); c.setDash()
            tag_w = 22; tag_h = 12
            c.setFillColor(BG_HEADER)
            c.rect(x1, y_top-tag_h, tag_w, tag_h, stroke=0, fill=1)
            c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 6.5)
            c.drawString(x1+3, y_top-tag_h+3, "alt")
            c.setFillColor(colors.white); c.setFont("Helvetica-Oblique", 7)
            c.drawString(x1+26, y_top-10, condition)

        def divider_line(y, x1, x2, label=""):
            c.setStrokeColor(C_GREY_D); c.setLineWidth(0.5); c.setDash(3, 3)
            c.line(x1, y, x2, y); c.setDash()
            if label:
                c.setFillColor(colors.white); c.setFont("Helvetica-Oblique", 7)
                c.drawString(x1+5, y+2, label)

        # ─────────────────────────────────────────────────────────────────────
        # MESSAGES
        # ─────────────────────────────────────────────────────────────────────
        y = TOP_Y - 18

        # ── Section 1: Client sends request ──────────────────────────────────
        section_bar(y, "1. Client sends registration request")
        y -= 22
        solid_arrow(xs[0], xs[1], y, "POST /api/register { firstName, email, password, confirmPassword }")
        y -= 22
        solid_arrow(xs[1], xs[2], y, "invoke validateRegisterBody middleware")

        # ── Section 2: Gatekeeper validation ─────────────────────────────────
        y -= 26
        section_bar(y, "2. Gatekeeper validates request body (middleware/validateRegisterBody.js)")
        y -= 22
        self_loop(xs[2], y, "check required fields, email shape, password strength, confirmPassword match")

        alt_top = y + 8
        y -= 28

        # invalid path (top of alt)
        c.setFont("Helvetica", 7.5); c.setFillColor(C_RED_D)
        c.drawString(xs[0]+5, y+5, "[Invalid body — missing field / weak password / passwords don't match]")
        dashed_arrow(xs[2], xs[0], y-8, '400 { "success":false, "error":"<field validation message>" }', C_RED_D)

        div_y = y - 22
        divider_line(div_y, xs[0]-18, W-6, "[body valid]")
        y = div_y - 18

        # valid path
        c.setFont("Helvetica", 7.5); c.setFillColor(C_GREEN_D)
        c.drawString(xs[2]+5, y+5, "[All fields valid]  next() → registerController")
        alt_bot = y - 8
        alt_frame(xs[0]-18, alt_top, W-6, alt_bot, "[Body Validation]")
        y = alt_bot - 14

        # ── Section 3: Controller calls Service ───────────────────────────────
        section_bar(y, "3. Controller calls Register Service")
        y -= 22
        solid_arrow(xs[1], xs[3], y, "registerUser(firstName, email, password)")

        # ── Section 4: Service processes registration ─────────────────────────
        y -= 26
        section_bar(y, "4. Service processes registration (services/registerService.js)")
        y -= 22
        solid_arrow(xs[3], xs[4], y, "loadUsers()  —  fs.readFileSync(users.json)")
        y -= 18
        dashed_arrow(xs[4], xs[3], y, "users[ ]")
        y -= 22
        self_loop(xs[3], y, "check: users.find(u => u.username === email)")

        alt_top2 = y + 8
        y -= 28

        # duplicate branch
        c.setFont("Helvetica", 7.5); c.setFillColor(C_RED_D)
        c.drawString(xs[0]+5, y+5, "[Email already registered]  throw EMAIL_TAKEN")
        dashed_arrow(xs[3], xs[0], y-8, '409 { "success":false, "error":"An account with that email address already exists." }', C_RED_D)

        div_y2 = y - 22
        divider_line(div_y2, xs[0]-18, W-6, "[new email]")
        y = div_y2 - 16

        # new-email path
        self_loop(xs[3], y, "bcrypt.hash(password, 12)  —  SALT_ROUNDS=12")
        y -= 28
        solid_arrow(xs[3], xs[4], y, "saveUsers([...users, newUser])  —  fs.writeFileSync")
        alt_bot2 = y - 14
        alt_frame(xs[0]-18, alt_top2, W-6, alt_bot2, "[Duplicate Email Check]")
        y = alt_bot2 - 14

        # ── Section 5: Response returned ──────────────────────────────────────
        section_bar(y, "5. Response returned to Client")
        y -= 22
        dashed_arrow(xs[3], xs[1], y, "{ id, firstName, email, registeredAt }  (safe subset — no passwordHash)")
        y -= 20
        dashed_arrow(xs[1], xs[0], y,
                     '201 { "success":true, "message":"Account created! Please log in, <name>.", "user":{...} }',
                     C_GREEN_D)

        # ── Bottom actors ────────────────────────────────────────────────────
        for x, lbl in zip(xs, actors):
            actor_box(x, BOT_Y, lbl)

        # ── Outer border ─────────────────────────────────────────────────────
        c.setStrokeColor(C_GREY_D); c.setLineWidth(0.5); c.setDash()
        c.rect(1, 1, W-2, H-2, stroke=1, fill=0)


# ── Build document ─────────────────────────────────────────────────────────

def build():
    doc = SimpleDocTemplate(
        OUT,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title="Register API Documentation — Stylish",
        author="Stylish Dev Team",
        subject="POST /api/register — CRS Pattern Documentation",
    )

    W = A4[0] - 4*cm   # usable width
    story = []

    # ── Cover ───────────────────────────────────────────────────────────────
    story.append(CoverPage())
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 1 — GenAI Prompts
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("01", S["section_num"]))
    story.append(Paragraph("GenAI Prompts", S["section_title"]))
    story.append(ColorRule(CRIMSON, 2))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "The two prompts below were used to generate the mock database and the "
        "authentication route. They are recorded here verbatim so the generation "
        "steps are reproducible and auditable.",
        S["body"]
    ))
    story.append(Spacer(1, 12))

    # Prompt 1
    story.append(KeepTogether([
        Paragraph("PROMPT 1 — Database Preparation", S["prompt_label"]),
        Table(
            [[Paragraph(
                "Generate a JSON file of 10 registered users with username (email), "
                "password (hash with MD5), first name, and date of registration. "
                "Also, give me the list of paired email and plaintext password for login testing.",
                S["prompt_body"]
            )]],
            colWidths=[W],
            style=TableStyle([
                ("BACKGROUND",  (0,0), (-1,-1), LIGHT_BG),
                ("LEFTPADDING",  (0,0), (-1,-1), 10),
                ("RIGHTPADDING", (0,0), (-1,-1), 10),
                ("TOPPADDING",   (0,0), (-1,-1), 10),
                ("BOTTOMPADDING",(0,0), (-1,-1), 10),
                ("BOX",          (0,0), (-1,-1), 1, colors.HexColor("#e0dbd0")),
                ("LINEBEFORE",   (0,0), (0,-1),  3, CRIMSON),
            ])
        ),
        Spacer(1, 4),
        Paragraph(
            "⚠  Implementation note: MD5 is not suitable for password storage. "
            "bcrypt was used instead because it is intentionally slow and embeds a "
            "unique salt in every hash, preventing rainbow-table and brute-force attacks.",
            S["note"]
        ),
    ]))

    story.append(Spacer(1, 14))

    # Prompt 2
    story.append(KeepTogether([
        Paragraph("PROMPT 2 — API Route Generation", S["prompt_label"]),
        Table(
            [[Paragraph(
                "Act as a Security Engineer. Write a Node.js/Express POST route for "
                "/api/login. It should receive an email and a password. If the email "
                "is not in my database, return 401 Unauthorized status. If it exists, "
                "use a library like bcrypt to compare the submitted password with a "
                "hashed one in my database. If it matches, use jsonwebtoken to sign a "
                "token containing the user's ID. Return the token with a 200 status.",
                S["prompt_body"]
            )]],
            colWidths=[W],
            style=TableStyle([
                ("BACKGROUND",  (0,0), (-1,-1), LIGHT_BG),
                ("LEFTPADDING",  (0,0), (-1,-1), 10),
                ("RIGHTPADDING", (0,0), (-1,-1), 10),
                ("TOPPADDING",   (0,0), (-1,-1), 10),
                ("BOTTOMPADDING",(0,0), (-1,-1), 10),
                ("BOX",          (0,0), (-1,-1), 1, colors.HexColor("#e0dbd0")),
                ("LINEBEFORE",   (0,0), (0,-1),  3, CRIMSON),
            ])
        ),
    ]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 2 — Contract Table
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("02", S["section_num"]))
    story.append(Paragraph("API Contract Table", S["section_title"]))
    story.append(ColorRule(CRIMSON, 2))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "All three endpoints exposed by the Stylish backend. Each row defines "
        "the method, path, request shape, and every possible response status with "
        "its payload schema.",
        S["body"]
    ))
    story.append(Spacer(1, 12))

    # ── 2a: Endpoint overview ──────────────────────────────────────────────
    story.append(Paragraph("2.1  Endpoint Overview", S["sub_title"]))

    hdr_style = TableStyle([
        ("BACKGROUND",   (0,0), (-1, 0), SLATE),
        ("TEXTCOLOR",    (0,0), (-1, 0), WHITE),
        ("FONTNAME",     (0,0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1, 0), 9),
        ("FONTNAME",     (0,1), (-1,-1), "Helvetica"),
        ("FONTSIZE",     (0,1), (-1,-1), 8.5),
        ("LEADING",      (0,0), (-1,-1), 13),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [WHITE, LIGHT_BG]),
        ("GRID",         (0,0), (-1,-1), 0.4, RULE),
        ("LEFTPADDING",  (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
    ])

    def P(text, bold=False, col=INK, size=8.5):
        fn = "Helvetica-Bold" if bold else "Helvetica"
        st = make_style(f"_p{id(text)}", fontSize=size, fontName=fn,
                        textColor=col, leading=12)
        return Paragraph(text, st)

    overview_data = [
        ["Method", "Route", "Auth Required", "Purpose"],
        ["GET",    "/api/products",   "No",  "List products; optional ?category= filter"],
        ["POST",   "/api/login",      "No",  "Authenticate user, receive JWT"],
        ["POST",   "/api/register",   "No",  "Create new user account"],
    ]
    method_colors = {"GET": BLUE, "POST": GREEN}
    overview_rows = [[P(r[0], bold=True, col=method_colors.get(r[0], INK)) if i==0
                      else P(r[i]) for i in range(4)]
                     if ri > 0 else [P(c, bold=True, col=WHITE) for c in r]
                     for ri, r in enumerate(overview_data)]

    story.append(Table(
        overview_rows,
        colWidths=[W*0.10, W*0.25, W*0.18, W*0.47],
        style=hdr_style
    ))

    story.append(Spacer(1, 18))

    # ── 2b: POST /api/register detail ─────────────────────────────────────
    story.append(Paragraph("2.2  POST /api/register — Full Contract", S["sub_title"]))

    # Request body
    story.append(Paragraph("Request Body (Content-Type: application/json)", S["prompt_label"]))
    req_data = [
        ["Field", "Type", "Required", "Validation Rules"],
        ["firstName",       "string", "Yes", "Non-empty · max 50 chars"],
        ["email",           "string", "Yes", "Valid email shape · lowercased on arrival"],
        ["password",        "string", "Yes", "Min 8 chars · 1 uppercase · 1 digit · 1 special char"],
        ["confirmPassword", "string", "Yes", "Must match `password` exactly"],
    ]
    req_rows = [[P(c, bold=True, col=WHITE) for c in req_data[0]]] + \
               [[P(r[0], bold=True, col=CRIMSON), P(r[1]), P(r[2]),
                 P(r[3])] for r in req_data[1:]]
    story.append(Table(
        req_rows,
        colWidths=[W*0.20, W*0.12, W*0.13, W*0.55],
        style=hdr_style
    ))
    story.append(Spacer(1, 12))

    # Response table
    story.append(Paragraph("Response Codes", S["prompt_label"]))
    resp_colors = {"201": GREEN, "400": AMBER, "409": colors.HexColor("#7c3aed"), "500": CRIMSON}
    resp_data = [
        ["Status", "Condition", "Response Body"],
        ["201 Created",
         "All fields valid, email not taken, user written to DB",
         '{ "success": true, "message": "Welcome, Noon!", "user": { "id", "firstName", "email", "registeredAt" } }'],
        ["400 Bad Request",
         "Missing field / type mismatch / weak password / passwords don\'t match",
         '{ "success": false, "error": "\\`password\\` and \\`confirmPassword\\` do not match." }'],
        ["409 Conflict",
         "Email already exists in users.json",
         '{ "success": false, "error": "An account with that email address already exists." }'],
        ["500 Internal Server Error",
         "JSON write failure or unexpected runtime error",
         '{ "success": false, "error": "Failed to create account due to a server error." }'],
    ]
    resp_rows = [[P(c, bold=True, col=WHITE) for c in resp_data[0]]]
    for r in resp_data[1:]:
        code = r[0].split()[0]
        col  = resp_colors.get(code, INK)
        resp_rows.append([P(r[0], bold=True, col=col), P(r[1]), P(r[2])])

    story.append(Table(
        resp_rows,
        colWidths=[W*0.17, W*0.30, W*0.53],
        style=TableStyle([
            ("BACKGROUND",    (0,0),  (-1, 0), SLATE),
            ("TEXTCOLOR",     (0,0),  (-1, 0), WHITE),
            ("FONTNAME",      (0,0),  (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0),  (-1, 0), 9),
            ("FONTNAME",      (0,1),  (-1,-1), "Helvetica"),
            ("FONTSIZE",      (0,1),  (-1,-1), 8),
            ("LEADING",       (0,0),  (-1,-1), 12),
            ("ROWBACKGROUNDS",(0,1),  (-1,-1), [WHITE, LIGHT_BG]),
            ("GRID",          (0,0),  (-1,-1), 0.4, RULE),
            ("LEFTPADDING",   (0,0),  (-1,-1), 8),
            ("RIGHTPADDING",  (0,0),  (-1,-1), 8),
            ("TOPPADDING",    (0,0),  (-1,-1), 6),
            ("BOTTOMPADDING", (0,0),  (-1,-1), 6),
            ("VALIGN",        (0,0),  (-1,-1), "TOP"),
        ])
    ))

    story.append(Spacer(1, 16))

    # ── 2c: Middleware pipeline ────────────────────────────────────────────
    story.append(Paragraph("2.3  POST /api/login — Abbreviated Contract", S["sub_title"]))

    login_resp = [
        ["Status", "Condition", "Response Body"],
        ["200 OK",
         "Email found in DB, bcrypt.compare succeeds",
         '{ "success": true, "token": "eyJ...", "user": { "id", "firstName", "email" } }'],
        ["400 Bad Request",
         "Missing or malformed email / empty password",
         '{ "success": false, "error": "\\`email\\` is required." }'],
        ["401 Unauthorized",
         "Email not found OR password wrong (intentionally same message)",
         '{ "success": false, "error": "Invalid email or password." }'],
        ["500 Internal Server Error",
         "File I/O or JWT signing failure",
         '{ "success": false, "error": "An internal server error occurred." }'],
    ]
    login_rows = [[P(c, bold=True, col=WHITE) for c in login_resp[0]]]
    for r in login_resp[1:]:
        code = r[0].split()[0]
        col  = resp_colors.get(code, INK)
        login_rows.append([P(r[0], bold=True, col=col), P(r[1]), P(r[2])])

    story.append(Table(
        login_rows,
        colWidths=[W*0.17, W*0.30, W*0.53],
        style=TableStyle([
            ("BACKGROUND",    (0,0),  (-1, 0), SLATE),
            ("TEXTCOLOR",     (0,0),  (-1, 0), WHITE),
            ("FONTNAME",      (0,0),  (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0),  (-1, 0), 9),
            ("FONTNAME",      (0,1),  (-1,-1), "Helvetica"),
            ("FONTSIZE",      (0,1),  (-1,-1), 8),
            ("LEADING",       (0,0),  (-1,-1), 12),
            ("ROWBACKGROUNDS",(0,1),  (-1,-1), [WHITE, LIGHT_BG]),
            ("GRID",          (0,0),  (-1,-1), 0.4, RULE),
            ("LEFTPADDING",   (0,0),  (-1,-1), 8),
            ("RIGHTPADDING",  (0,0),  (-1,-1), 8),
            ("TOPPADDING",    (0,0),  (-1,-1), 6),
            ("BOTTOMPADDING", (0,0),  (-1,-1), 6),
            ("VALIGN",        (0,0),  (-1,-1), "TOP"),
        ])
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # SECTION 3 — Diagrams
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("03", S["section_num"]))
    story.append(Paragraph("Architecture Diagrams", S["section_title"]))
    story.append(ColorRule(CRIMSON, 2))
    story.append(Spacer(1, 8))

    # ── 3a: CRS file structure ─────────────────────────────────────────────
    story.append(Paragraph("3.1  Controller–Route–Service File Structure", S["sub_title"]))

    fs_data = [
        ["Layer",        "File",                               "Responsibility"],
        ["Route",        "server/routes/register.js",          "Declares POST / pipeline: [Gatekeeper → Controller]"],
        ["Route",        "server/routes/auth.js",              "Declares POST / pipeline: [Gatekeeper → Controller]"],
        ["Middleware",   "server/middleware/validateRegisterBody.js", "Gatekeeper: shape, types, password strength, confirmPassword match"],
        ["Middleware",   "server/middleware/validateLoginBody.js",    "Gatekeeper: required fields, email format"],
        ["Controller",   "server/controllers/registerController.js",  "HTTP bridge: extracts body, calls service, maps errors to status codes"],
        ["Controller",   "server/controllers/authController.js",      "HTTP bridge for login: maps INVALID_CREDENTIALS → 401"],
        ["Service",      "server/services/registerService.js",        "Duplicate check → bcrypt.hash → JSON write → return safe user"],
        ["Service",      "server/services/authService.js",            "Lookup → constant-time bcrypt.compare → jwt.sign"],
        ["Data",         "data/json/users.json",                      "Mock database: 10 seed users (bcrypt hashes) + live appends"],
        ["Entry",        "server/app.js",                             "Mounts all routes under /api/*; global middleware"],
        ["Entry",        "server/server.js",                          "Binds to PORT 3000; imports app.js"],
    ]
    layer_colors = {
        "Route":      colors.HexColor("#dbeafe"),
        "Middleware": colors.HexColor("#fff0ee"),
        "Controller": colors.HexColor("#f0fdf4"),
        "Service":    colors.HexColor("#fefce8"),
        "Data":       colors.HexColor("#f3f4f6"),
        "Entry":      colors.HexColor("#f5f3ff"),
    }
    layer_text_colors = {
        "Route":      BLUE,
        "Middleware": CRIMSON,
        "Controller": GREEN,
        "Service":    AMBER,
        "Data":       colors.HexColor("#555555"),
        "Entry":      colors.HexColor("#7c3aed"),
    }

    fs_rows = [[P(c, bold=True, col=WHITE) for c in fs_data[0]]]
    for r in fs_data[1:]:
        layer = r[0]
        bg    = layer_colors.get(layer, WHITE)
        tc    = layer_text_colors.get(layer, INK)
        fs_rows.append([
            P(r[0], bold=True, col=tc),
            Paragraph(f'<font name="Courier" size="7.5">{r[1]}</font>',
                      make_style("_code", fontSize=7.5, fontName="Courier",
                                 textColor=INK, leading=11)),
            P(r[2]),
        ])

    fs_style = TableStyle([
        ("BACKGROUND",    (0,0),  (-1, 0), SLATE),
        ("TEXTCOLOR",     (0,0),  (-1, 0), WHITE),
        ("FONTNAME",      (0,0),  (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),  (-1, 0), 9),
        ("LEADING",       (0,0),  (-1,-1), 12),
        ("GRID",          (0,0),  (-1,-1), 0.4, RULE),
        ("LEFTPADDING",   (0,0),  (-1,-1), 7),
        ("RIGHTPADDING",  (0,0),  (-1,-1), 7),
        ("TOPPADDING",    (0,0),  (-1,-1), 5),
        ("BOTTOMPADDING", (0,0),  (-1,-1), 5),
        ("VALIGN",        (0,0),  (-1,-1), "TOP"),
    ])
    for i, r in enumerate(fs_data[1:], 1):
        bg = layer_colors.get(r[0], WHITE)
        fs_style.add("BACKGROUND", (0, i), (-1, i), bg)

    story.append(Table(
        fs_rows,
        colWidths=[W*0.13, W*0.36, W*0.51],
        style=fs_style
    ))

    story.append(Spacer(1, 20))

    # ── 3b: UML Sequence Diagram ───────────────────────────────────────────
    story.append(Paragraph("3.2  POST /api/register — UML Sequence Diagram", S["sub_title"]))
    story.append(Paragraph(
        "Full UML sequence diagram showing the request lifecycle. Gold-circled "
        "numbers mark each message step. Dashed lifelines connect actors. "
        "Alt frames show the Gatekeeper 400 short-circuit and the 409 duplicate-email "
        "branch. Dashed arrows are return/response flows.",
        S["body"]
    ))
    story.append(Spacer(1, 8))
    story.append(RegisterSequenceDiagram())
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Fig 1. POST /api/register sequence — Client → Router → Gatekeeper → "
        "Register Service → users.json. Alt frames cover body-validation failure (400), "
        "duplicate-email conflict (409), and the success path (201).",
        S["caption"]
    ))

    story.append(Spacer(1, 20))

    # ── 3c: Security decisions table ──────────────────────────────────────
    story.append(Paragraph("3.3  Security Design Decisions", S["sub_title"]))

    sec_data = [
        ["Decision",                    "Reason"],
        ["bcrypt (SALT_ROUNDS=12)\ninstead of MD5",
         "MD5 is a fast digest crackable in milliseconds with a GPU. bcrypt is "
         "intentionally slow; cost factor 12 takes ~250 ms per hash, making "
         "brute-force impractical."],
        ["Generic 401 message\n'Invalid email or password.'",
         "Returning different messages for 'email not found' vs 'wrong password' "
         "allows user-enumeration. A single message leaks nothing."],
        ["Constant-time bcrypt.compare\nfor unknown emails",
         "Without this, an attacker can detect valid emails via response-time "
         "differences (~0 ms vs ~250 ms). Comparing against a dummy hash equalises timing."],
        ["JWT payload contains only\nid, firstName, email",
         "JWTs are Base64-decodable by anyone. Sensitive data (passwordHash, "
         "addresses, payment info) must never appear in the payload."],
        ["JWT_SECRET from process.env",
         "Hardcoding secrets in source code exposes them in git history and "
         "build artefacts. Environment variables keep them out of the codebase."],
        ["confirmPassword checked\nin Gatekeeper, not service",
         "Structural validation belongs at the boundary. The service should "
         "never receive mismatched passwords — it assumes inputs are pre-validated."],
    ]

    sec_rows = [[P(c, bold=True, col=WHITE) for c in sec_data[0]]]
    for r in sec_data[1:]:
        sec_rows.append([
            Paragraph(r[0].replace("\n", "<br/>"),
                      make_style("_sd", fontSize=8.5, fontName="Helvetica-Bold",
                                 textColor=INK, leading=12)),
            P(r[1]),
        ])

    story.append(Table(
        sec_rows,
        colWidths=[W*0.30, W*0.70],
        style=TableStyle([
            ("BACKGROUND",    (0,0),  (-1, 0), SLATE),
            ("TEXTCOLOR",     (0,0),  (-1, 0), WHITE),
            ("FONTNAME",      (0,0),  (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0),  (-1, 0), 9),
            ("FONTNAME",      (0,1),  (-1,-1), "Helvetica"),
            ("FONTSIZE",      (0,1),  (-1,-1), 8.5),
            ("LEADING",       (0,0),  (-1,-1), 13),
            ("ROWBACKGROUNDS",(0,1),  (-1,-1), [WHITE, LIGHT_BG]),
            ("GRID",          (0,0),  (-1,-1), 0.4, RULE),
            ("LEFTPADDING",   (0,0),  (-1,-1), 8),
            ("RIGHTPADDING",  (0,0),  (-1,-1), 8),
            ("TOPPADDING",    (0,0),  (-1,-1), 6),
            ("BOTTOMPADDING", (0,0),  (-1,-1), 6),
            ("VALIGN",        (0,0),  (-1,-1), "TOP"),
            ("LINEBEFORE",    (0,1),  (0,-1),  3, CRIMSON),
        ])
    ))

    # ── Page numbers via onLaterPages ────────────────────────────────────────
    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#888888"))
        canvas.drawCentredString(A4[0]/2, 1.2*cm,
            f"Stylish — Register API Documentation   ·   Page {doc.page}")
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.4)
        canvas.line(2*cm, 1.5*cm, A4[0]-2*cm, 1.5*cm)
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"✅  PDF written → {OUT}")


if __name__ == "__main__":
    build()
