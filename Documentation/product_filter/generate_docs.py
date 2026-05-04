"""
generate_docs.py — Product Filter API Documentation
Produces product_filter_documentation.pdf in the same directory.
Sections: 1) GenAI Prompt  2) Contract Table  3) Sequence Diagram
Sequence diagram matches the dark-background UML style from course materials.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, PageBreak
)
from reportlab.platypus.flowables import Flowable

OUT = os.path.join(os.path.dirname(__file__), "product_filter_documentation.pdf")
W_PAGE, H_PAGE = A4

# ── Palette ─────────────────────────────────────────────────────────────────
BG_DARK   = colors.HexColor("#0d1117")   # diagram background
BG_ACTOR  = colors.HexColor("#21262d")   # actor box fill
BG_HEADER = colors.HexColor("#30363d")   # section header strip
BG_ALT    = colors.HexColor("#1a2233")   # alt-frame fill (subtle)
C_WHITE   = colors.white
C_GOLD    = colors.HexColor("#e3b341")   # step-number circle
C_BLUE    = colors.HexColor("#58a6ff")   # solid arrows
C_DASHED  = colors.HexColor("#8b949e")   # dashed return arrows
C_GREEN   = colors.HexColor("#3fb950")   # success
C_RED     = colors.HexColor("#f85149")   # error
C_GREY    = colors.HexColor("#8b949e")   # alt border / lifeline
C_CRIMSON = colors.HexColor("#c8351f")
C_SLATE   = colors.HexColor("#2a1f3d")
C_PAPER   = colors.HexColor("#f3eee5")
C_LIGHT   = colors.HexColor("#f8f4ed")
C_RULE    = colors.HexColor("#cccccc")
C_AMBER   = colors.HexColor("#b45309")
C_INK     = colors.HexColor("#111110")

styles = getSampleStyleSheet()

def st(name, parent="Normal", **kw):
    return ParagraphStyle(name, parent=styles[parent], **kw)

S = {
    "sec_num":   st("sec_num",   fontSize=9,  textColor=C_CRIMSON, fontName="Helvetica-Bold", letterSpacing=2, spaceAfter=2),
    "sec_title": st("sec_title", fontSize=20, textColor=C_INK,     fontName="Helvetica-Bold", spaceBefore=16, spaceAfter=6, leading=24),
    "sub":       st("sub",       fontSize=13, textColor=C_INK,     fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=5, leading=16),
    "body":      st("body",      fontSize=10, textColor=C_INK,     leading=16, spaceAfter=6, fontName="Helvetica", alignment=TA_JUSTIFY),
    "prompt_lbl":st("prlbl",     fontSize=8,  textColor=C_CRIMSON, fontName="Helvetica-Bold", letterSpacing=1.5, spaceAfter=4),
    "prompt":    st("prompt",    fontSize=10, textColor=C_INK,     leading=15, fontName="Helvetica", backColor=C_LIGHT, borderPadding=(8,10,8,10), spaceAfter=4),
    "note":      st("note",      fontSize=9,  textColor=C_AMBER,   fontName="Helvetica-Oblique", leading=13, spaceAfter=4),
    "caption":   st("caption",   fontSize=8,  textColor=colors.HexColor("#555555"), fontName="Helvetica-Oblique", alignment=TA_CENTER, spaceAfter=2),
    "footer":    st("footer",    fontSize=8,  textColor=colors.HexColor("#888888"), fontName="Helvetica", alignment=TA_CENTER),
}

def P(text, bold=False, col=C_INK, size=8.5, mono=False):
    fn = "Courier" if mono else ("Helvetica-Bold" if bold else "Helvetica")
    return Paragraph(text, st(f"_p{id(text)}", fontSize=size, fontName=fn,
                               textColor=col, leading=size+4))

class ColorRule(Flowable):
    def __init__(self, color=C_CRIMSON, h=2, w=None):
        Flowable.__init__(self); self.color=color; self.h=h; self._w=w
    def wrap(self, aw, ah):
        self.width = self._w or aw; self.height = self.h+4; return self.width, self.height
    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 2, self.width, self.h, stroke=0, fill=1)

# ════════════════════════════════════════════════════════════════════════════
# COVER
# ════════════════════════════════════════════════════════════════════════════
class CoverPage(Flowable):
    def wrap(self, aw, ah): self.aw=aw; self.ah=ah; return aw, ah
    def draw(self):
        c = self.canv; w, h = self.aw, self.ah
        # dark panel
        c.setFillColor(C_SLATE); c.rect(0, h*.38, w, h*.62, stroke=0, fill=1)
        c.setFillColor(C_CRIMSON); c.rect(0, h*.38-6, w, 6, stroke=0, fill=1)
        # acid accent circle
        c.setFillColor(colors.HexColor("#d6ff3d")); c.circle(w-50, h-50, 28, stroke=0, fill=1)
        c.setFillColor(C_CRIMSON); c.circle(w-50, h-50, 16, stroke=0, fill=1)
        # title
        c.setFillColor(C_WHITE); c.setFont("Helvetica-Bold", 34)
        c.drawString(40, h*.38+h*.62-82, "Product Filter API")
        c.setFont("Helvetica-Bold", 24); c.setFillColor(colors.HexColor("#d6ff3d"))
        c.drawString(40, h*.38+h*.62-118, "Documentation")
        c.setFillColor(colors.HexColor("#c8c0d8")); c.setFont("Helvetica", 11)
        for i, line in enumerate([
            "GET /api/products?category=<value>",
            "Controller · Route · Service Pattern",
            "Node.js · Express 4 · JSON Data Source",
            "Gatekeeper Validation · Category Filtering",
        ]):
            c.drawString(40, h*.38+h*.62-156-i*18, line)
        # bottom band
        c.setFillColor(C_PAPER); c.rect(0, 0, w, h*.38, stroke=0, fill=1)
        info = [
            ("Project",  "Stylish Shoes Online Store"),
            ("Module",   "Product Catalogue — Category Filter"),
            ("Endpoint", "GET /api/products?category={Casual|Formal|Hiking|Running|Sneakers|Training}"),
            ("Pattern",  "CRS — Controller · Route · Service"),
            ("Date",     "May 2026"),
        ]
        y = h*.38-32
        for label, value in info:
            c.setFont("Helvetica-Bold", 8); c.setFillColor(C_CRIMSON)
            c.drawString(40, y, label.upper())
            c.setFont("Helvetica", 9); c.setFillColor(C_INK)
            c.drawString(120, y, value); y -= 18
        c.setStrokeColor(C_RULE); c.setLineWidth(0.5)
        c.rect(20, 20, w-40, h-40, stroke=1, fill=0)

# ════════════════════════════════════════════════════════════════════════════
# UML SEQUENCE DIAGRAM  (dark background, matches course style)
# ════════════════════════════════════════════════════════════════════════════
class SequenceDiagram(Flowable):
    """
    Actors: Client (Browser) | API Gateway | Express Server | products.json
    Matches the dark-bg style from 06_Security & Auth Logic.pdf screenshot:
      - very dark background
      - actor boxes top & bottom
      - numbered gold circles on arrows
      - dashed lifelines
      - grey section-header bars
      - alt combined-fragment boxes with dashed borders
      - dashed return arrows
      - self-loop arrows
    """
    W = 500
    H = 620

    def wrap(self, aw, ah): return self.W, self.H

    def draw(self):
        c = self.canv
        W, H = self.W, self.H

        # ── Background ──────────────────────────────────────────────────
        c.setFillColor(BG_DARK)
        c.rect(0, 0, W, H, stroke=0, fill=1)

        # ── Actor configuration ─────────────────────────────────────────
        actors = [
            "Client\n(Browser)",
            "API Gateway",
            "Express Server\n(CRS)",
            "products.json",
        ]
        n = len(actors)
        ACTOR_W = 90
        ACTOR_H = 32
        # evenly space actor centres
        xs = [W * (i + 0.5) / n for i in range(n)]

        TOP_Y    = H - ACTOR_H - 12
        BOT_Y    = 12
        LIFE_TOP = TOP_Y
        LIFE_BOT = BOT_Y + ACTOR_H

        # ── Lifelines ────────────────────────────────────────────────────
        c.setStrokeColor(C_GREY); c.setLineWidth(0.6)
        c.setDash(4, 4)
        for x in xs:
            c.line(x, LIFE_TOP, x, LIFE_BOT)
        c.setDash()

        # ── Draw actor box (top or bottom) ───────────────────────────────
        def actor_box(x, y, label):
            bx = x - ACTOR_W/2; by = y
            c.setFillColor(BG_ACTOR)
            c.setStrokeColor(C_GREY); c.setLineWidth(0.8)
            c.rect(bx, by, ACTOR_W, ACTOR_H, stroke=1, fill=1)
            lines = label.split("\n")
            c.setFillColor(C_WHITE); c.setFont("Helvetica-Bold", 7.5)
            if len(lines) == 1:
                c.drawCentredString(x, by + ACTOR_H/2 - 3, lines[0])
            else:
                c.drawCentredString(x, by + ACTOR_H/2 + 2, lines[0])
                c.setFont("Helvetica", 6.5)
                c.drawCentredString(x, by + ACTOR_H/2 - 7, lines[1])

        # Draw top actors
        for i, (x, label) in enumerate(zip(xs, actors)):
            actor_box(x, TOP_Y, label)

        # ── Section header bar ───────────────────────────────────────────
        def section_bar(y, text):
            c.setFillColor(BG_HEADER)
            c.rect(4, y-9, W-8, 18, stroke=0, fill=1)
            c.setFillColor(C_WHITE); c.setFont("Helvetica-Bold", 8)
            c.drawString(12, y-4, text)

        # ── Arrow helpers ────────────────────────────────────────────────
        step_num = [0]

        def solid_arrow(x1, x2, y, label, col=C_BLUE, num=True):
            """Horizontal solid arrow with optional numbered circle."""
            step_num[0] += 1
            n_str = str(step_num[0])
            direction = 1 if x2 > x1 else -1
            # line
            c.setStrokeColor(col); c.setLineWidth(1.2); c.setDash()
            c.line(x1, y, x2 - direction*6, y)
            # arrowhead
            tip = x2 - direction*1
            pts = [tip, y, tip-direction*8, y+4, tip-direction*8, y-4]
            p = c.beginPath()
            p.moveTo(pts[0], pts[1]); p.lineTo(pts[2], pts[3])
            p.lineTo(pts[4], pts[5]); p.close()
            c.setFillColor(col); c.drawPath(p, stroke=0, fill=1)
            # label above
            mid = (x1+x2)/2
            c.setFont("Helvetica", 7); c.setFillColor(C_WHITE)
            c.drawCentredString(mid, y+5, label)
            # numbered circle
            if num:
                cx = x1 + direction*16
                c.setFillColor(C_GOLD); c.circle(cx, y, 6, stroke=0, fill=1)
                c.setFillColor(BG_DARK); c.setFont("Helvetica-Bold", 6)
                c.drawCentredString(cx, y-2, n_str)

        def dashed_arrow(x1, x2, y, label, col=C_DASHED):
            """Dashed return arrow (no step number)."""
            direction = 1 if x2 > x1 else -1
            c.setStrokeColor(col); c.setLineWidth(0.9); c.setDash(4, 3)
            c.line(x1, y, x2 - direction*6, y)
            c.setDash()
            tip = x2 - direction*1
            pts = [tip, y, tip-direction*7, y+3.5, tip-direction*7, y-3.5]
            p = c.beginPath()
            p.moveTo(pts[0], pts[1]); p.lineTo(pts[2], pts[3])
            p.lineTo(pts[4], pts[5]); p.close()
            c.setFillColor(col); c.drawPath(p, stroke=0, fill=1)
            mid = (x1+x2)/2
            c.setFont("Helvetica", 7); c.setFillColor(col)
            c.drawCentredString(mid, y+5, label)

        def self_loop(x, y, label, col=C_BLUE):
            """Small self-referencing loop arrow on same actor."""
            step_num[0] += 1
            n_str = str(step_num[0])
            lw = 38; lh = 18
            c.setStrokeColor(col); c.setLineWidth(1.2); c.setDash()
            c.line(x, y, x+lw, y)
            c.line(x+lw, y, x+lw, y-lh)
            c.line(x+lw, y-lh, x+6, y-lh)
            # arrowhead pointing left
            pts = [x+6, y-lh, x+14, y-lh+4, x+14, y-lh-4]
            p = c.beginPath()
            p.moveTo(pts[0], pts[1]); p.lineTo(pts[2], pts[3])
            p.lineTo(pts[4], pts[5]); p.close()
            c.setFillColor(col); c.drawPath(p, stroke=0, fill=1)
            c.setFont("Helvetica", 7); c.setFillColor(C_WHITE)
            c.drawString(x+lw+3, y-lh/2-3, label)
            # number circle
            c.setFillColor(C_GOLD); c.circle(x+lw-4, y, 6, stroke=0, fill=1)
            c.setFillColor(BG_DARK); c.setFont("Helvetica-Bold", 6)
            c.drawCentredString(x+lw-4, y-2, n_str)

        def alt_frame(x1, y_top, x2, y_bot, condition, is_else=False):
            """UML alt combined-fragment box."""
            c.setStrokeColor(C_GREY); c.setLineWidth(0.7); c.setDash(3,3)
            c.rect(x1, y_bot, x2-x1, y_top-y_bot, stroke=1, fill=0)
            c.setDash()
            if not is_else:
                # 'alt' tag in top-left corner
                tag_w = 22; tag_h = 12
                c.setFillColor(BG_HEADER)
                c.rect(x1, y_top-tag_h, tag_w, tag_h, stroke=0, fill=1)
                c.setFillColor(C_WHITE); c.setFont("Helvetica-Bold", 6.5)
                c.drawString(x1+3, y_top-tag_h+3, "alt")
            # condition label
            c.setFillColor(C_WHITE); c.setFont("Helvetica-Oblique", 7)
            c.drawString(x1+26 if not is_else else x1+5, y_top-10, condition)

        def divider(y, x1, x2, label=""):
            """Dashed divider inside an alt frame."""
            c.setStrokeColor(C_GREY); c.setLineWidth(0.5); c.setDash(3,3)
            c.line(x1, y, x2, y); c.setDash()
            if label:
                c.setFillColor(C_WHITE); c.setFont("Helvetica-Oblique", 7)
                c.drawString(x1+5, y+2, label)

        # ─────────────────────────────────────────────────────────────────
        # MESSAGES  (top-down, y counts from top of usable area)
        # ─────────────────────────────────────────────────────────────────
        y = TOP_Y - 18   # start just below actor boxes

        # 1. Client sends request
        section_bar(y, "1. Client initiates product filter request")
        y -= 22
        solid_arrow(xs[0], xs[1], y, "GET /api/products?category=Running  (HTTPS)", C_BLUE)

        y -= 22
        solid_arrow(xs[1], xs[2], y, "Route request to Express Controller", C_BLUE)

        # 2. Gatekeeper section
        y -= 28
        section_bar(y, "2. Gatekeeper validation (validateProductsQuery middleware)")
        y -= 22

        # ALT frame: valid vs invalid category
        alt_top = y + 10
        # draw valid path first
        solid_arrow(xs[2], xs[2], y, "", col=C_BLUE, num=False)  # skip
        step_num[0] += 1  # step 3 = validate
        c.setFillColor(C_GOLD); c.circle(xs[2]-20, y, 6, stroke=0, fill=1)
        c.setFillColor(BG_DARK); c.setFont("Helvetica-Bold", 6)
        c.drawCentredString(xs[2]-20, y-2, "3")
        c.setFont("Helvetica", 7); c.setFillColor(C_WHITE)
        c.drawString(xs[2]+5, y+4, "validateProductsQuery(req, res, next)")
        c.setFont("Helvetica", 6.5); c.setFillColor(C_DASHED)
        c.drawString(xs[2]+5, y-8, "check: unknown params? invalid category?")

        # valid path
        y -= 28
        c.setFont("Helvetica", 7.5); c.setFillColor(C_GREEN)
        c.drawString(xs[2]+5, y+4, "[Category valid] normalise casing → next()")

        invalid_y = y - 10
        y -= 22
        # invalid path → dashed 400 back to client
        c.setFont("Helvetica", 7.5); c.setFillColor(C_RED)
        c.drawString(xs[2]+5, invalid_y-6, "[Category invalid e.g. ?category=Hat]")
        dashed_arrow(xs[2], xs[0], invalid_y-20,
                     '400 { "success":false, "error":"Unknown category \\"Hat\\"..." }', C_RED)
        alt_bot = invalid_y - 34

        alt_frame(xs[0]-20, alt_top, W-8, alt_bot, "[Category Validation]")
        y = alt_bot - 14

        # 3. Controller section
        section_bar(y, "3. Controller processes validated request")
        y -= 22
        solid_arrow(xs[2], xs[2], y, "", col=C_BLUE, num=False)
        step_num[0] += 1
        c.setFillColor(C_GOLD); c.circle(xs[2]-20, y, 6, stroke=0, fill=1)
        c.setFillColor(BG_DARK); c.setFont("Helvetica-Bold", 6)
        c.drawCentredString(xs[2]-20, y-2, str(step_num[0]))
        c.setFont("Helvetica", 7); c.setFillColor(C_WHITE)
        c.drawString(xs[2]+5, y+4, 'extract req.query.category  →  call getProducts(category)')

        y -= 24
        solid_arrow(xs[2], xs[3], y, "getProducts('Running')", C_BLUE)

        # 4. Service section
        y -= 22
        section_bar(y, "4. Service reads & filters data")
        y -= 22
        self_loop(xs[3], y, "fs.readFileSync(products.json)")

        y -= 28
        self_loop(xs[3], y, "filter(p => p.category === 'Running')")

        # 5. Return path
        y -= 28
        section_bar(y, "5. Response packaged and returned")
        y -= 22

        # ALT: success vs error
        alt_top2 = y + 10
        dashed_arrow(xs[3], xs[2], y, '{ products:[], total:4, category:"Running" }', C_DASHED)

        y -= 22
        c.setFont("Helvetica", 7.5); c.setFillColor(C_GREEN)
        c.drawCentredString((xs[2]+xs[1])/2, y+5, "[Success]")
        dashed_arrow(xs[2], xs[1], y,
                     '200 OK { "success":true, "data":[...], "meta":{ total, category } }', C_GREEN)

        y -= 20
        dashed_arrow(xs[1], xs[0], y,
                     '200 OK + JSON payload', C_GREEN)

        err_y = y - 14
        c.setFont("Helvetica", 7.5); c.setFillColor(C_RED)
        c.drawCentredString((xs[2]+xs[1])/2, err_y+5, "[File I/O or unexpected error]")
        dashed_arrow(xs[2], xs[0], err_y-8,
                     '500 { "success":false, "error":"Internal server error" }', C_RED)

        alt_bot2 = err_y - 22
        alt_frame(xs[0]-20, alt_top2, W-8, alt_bot2, "[Success / Error]")

        # ── Bottom actors ────────────────────────────────────────────────
        for x, label in zip(xs, actors):
            actor_box(x, BOT_Y, label)

        # ── Outer border ─────────────────────────────────────────────────
        c.setStrokeColor(C_GREY); c.setLineWidth(0.5); c.setDash()
        c.rect(1, 1, W-2, H-2, stroke=1, fill=0)


# ════════════════════════════════════════════════════════════════════════════
# BUILD
# ════════════════════════════════════════════════════════════════════════════
def build():
    doc = SimpleDocTemplate(
        OUT, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title="Product Filter API Documentation — Stylish",
        author="Stylish Dev Team",
    )
    USABLE_W = A4[0] - 4*cm
    story = []

    # ── Cover ────────────────────────────────────────────────────────────────
    story.append(CoverPage())
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # SECTION 1 — GenAI Prompt
    # ════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("01", S["sec_num"]))
    story.append(Paragraph("GenAI Prompt", S["sec_title"]))
    story.append(ColorRule(C_CRIMSON, 2))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "The following prompt was submitted to an AI assistant to generate the "
        "GET /api/products route. It is recorded verbatim so the generation "
        "process is reproducible and auditable.",
        S["body"]
    ))
    story.append(Spacer(1, 12))

    story.append(KeepTogether([
        Paragraph("PROMPT — Backend Architect / Product Filter Route", S["prompt_lbl"]),
        Table(
            [[Paragraph(
                "Act as a Backend Architect. Using Node.js and Express, write a route file "
                "to handle a GET request to /api/products. The route needs to accept a query "
                "parameter for 'category' (for example, ?category=Hat). Include 'Gatekeeper' "
                "validation to check if the query is valid, and fetch the matching products "
                "from a local JSON file. Return the packaged JSON response with a 200 OK "
                "status, or a 500 status if it fails. Ensure the code follows the "
                "Controller-Route-Service pattern and includes detailed comments explaining "
                "how the request, processing, and response lifecycle works.",
                S["prompt"]
            )]],
            colWidths=[USABLE_W],
            style=TableStyle([
                ("BACKGROUND",   (0,0),(-1,-1), C_LIGHT),
                ("LEFTPADDING",  (0,0),(-1,-1), 12),
                ("RIGHTPADDING", (0,0),(-1,-1), 12),
                ("TOPPADDING",   (0,0),(-1,-1), 12),
                ("BOTTOMPADDING",(0,0),(-1,-1), 12),
                ("BOX",          (0,0),(-1,-1), 1, colors.HexColor("#e0dbd0")),
                ("LINEBEFORE",   (0,0),(0,-1),  4, C_CRIMSON),
            ])
        ),
    ]))

    story.append(Spacer(1, 14))
    story.append(Paragraph(
        "⚠  Prompt note: The example uses '?category=Hat' which does not exist in the "
        "Stylish data source. Valid categories are: Casual, Formal, Hiking, Running, "
        "Sneakers, Training. The Gatekeeper rejects unknown values with a 400 response "
        "and lists the valid options in the error message.",
        S["note"]
    ))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # SECTION 2 — Contract Table
    # ════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("02", S["sec_num"]))
    story.append(Paragraph("API Contract Table", S["sec_title"]))
    story.append(ColorRule(C_CRIMSON, 2))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Defines the full HTTP contract for GET /api/products. Every possible "
        "input, validation rule, and response status is documented here.",
        S["body"]
    ))
    story.append(Spacer(1, 12))

    HDR = TableStyle([
        ("BACKGROUND",    (0,0),(-1, 0), C_SLATE),
        ("TEXTCOLOR",     (0,0),(-1, 0), colors.white),
        ("FONTNAME",      (0,0),(-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),(-1, 0), 9),
        ("FONTNAME",      (0,1),(-1,-1), "Helvetica"),
        ("FONTSIZE",      (0,1),(-1,-1), 8.5),
        ("LEADING",       (0,0),(-1,-1), 13),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [colors.white, C_LIGHT]),
        ("GRID",          (0,0),(-1,-1), 0.4, C_RULE),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("RIGHTPADDING",  (0,0),(-1,-1), 8),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ])

    # ── 2.1 Endpoint summary ─────────────────────────────────────────────────
    story.append(Paragraph("2.1  Endpoint Summary", S["sub"]))
    tbl = [
        [P("Field", bold=True, col=colors.white), P("Value", bold=True, col=colors.white)],
        [P("Method"),           P("GET")],
        [P("Path"),             P("/api/products", mono=True)],
        [P("Auth required"),    P("No")],
        [P("Content-Type"),     P("application/json  (response only)")],
        [P("Query parameter"),  P("category  (optional string)")],
        [P("Data source"),      P("data/json/products.json  (20 products)", mono=True)],
        [P("Pattern"),          P("CRS — Route → Gatekeeper Middleware → Controller → Service")],
    ]
    story.append(Table(tbl, colWidths=[USABLE_W*0.28, USABLE_W*0.72], style=HDR))
    story.append(Spacer(1, 14))

    # ── 2.2 Query parameter ──────────────────────────────────────────────────
    story.append(Paragraph("2.2  Query Parameter", S["sub"]))
    qp = [
        [P("Parameter", bold=True, col=colors.white),
         P("Type",      bold=True, col=colors.white),
         P("Required",  bold=True, col=colors.white),
         P("Validation rules",bold=True, col=colors.white)],
        [P("category", mono=True), P("string"), P("Optional"),
         Paragraph(
             "• Omit → returns ALL products (no filter)<br/>"
             "• If present: non-empty string<br/>"
             "• Must match one of: <b>Casual, Formal, Hiking, Running, Sneakers, Training</b><br/>"
             "• Case-insensitive: 'running' accepted, normalised to 'Running'<br/>"
             "• Unknown value → 400 with list of valid options",
             st("_qv", fontSize=8, fontName="Helvetica", leading=12, textColor=C_INK)
         )],
    ]
    story.append(Table(qp, colWidths=[USABLE_W*0.17, USABLE_W*0.10, USABLE_W*0.13, USABLE_W*0.60], style=HDR))
    story.append(Spacer(1, 14))

    # ── 2.3 Response codes ───────────────────────────────────────────────────
    story.append(Paragraph("2.3  Response Codes", S["sub"]))
    resp_cols = {
        "200": colors.HexColor("#15803d"),
        "400": C_AMBER,
        "500": C_CRIMSON,
    }
    resp = [
        [P("Status", bold=True, col=colors.white),
         P("Condition", bold=True, col=colors.white),
         P("Response body", bold=True, col=colors.white)],
        ["200", "Request valid (with or without category filter). Products returned.",
         '{\n  "success": true,\n  "data": [ ...products ],\n  "meta": { "total": 4, "category": "Running",\n    "availableCategories": ["Casual",...] }\n}'],
        ["400", "Unknown ?category value (e.g. ?category=Hat) or unknown query key.",
         '{ "success": false, "error": "Unknown category \\"Hat\\". Valid options: Casual, Formal, ..." }'],
        ["500", "Unexpected error: products.json missing or unreadable, or runtime exception.",
         '{ "success": false, "error": "An internal server error occurred." }'],
    ]
    resp_rows = [resp[0]]
    for r in resp[1:]:
        code = r[0]
        col  = resp_cols.get(code, C_INK)
        resp_rows.append([
            P(f"{code}", bold=True, col=col),
            P(r[1]),
            Paragraph(r[2].replace("\n", "<br/>"),
                      st("_rv", fontSize=7.5, fontName="Courier", leading=11, textColor=C_INK)),
        ])
    story.append(Table(
        resp_rows,
        colWidths=[USABLE_W*0.10, USABLE_W*0.30, USABLE_W*0.60],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1, 0), C_SLATE),
            ("TEXTCOLOR",     (0,0),(-1, 0), colors.white),
            ("FONTNAME",      (0,0),(-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0),(-1, 0), 9),
            ("FONTNAME",      (0,1),(-1,-1), "Helvetica"),
            ("FONTSIZE",      (0,1),(-1,-1), 8.5),
            ("LEADING",       (0,0),(-1,-1), 13),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [colors.white, C_LIGHT]),
            ("GRID",          (0,0),(-1,-1), 0.4, C_RULE),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
            ("RIGHTPADDING",  (0,0),(-1,-1), 8),
            ("TOPPADDING",    (0,0),(-1,-1), 7),
            ("BOTTOMPADDING", (0,0),(-1,-1), 7),
            ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ])
    ))
    story.append(Spacer(1, 14))

    # ── 2.4 CRS file map ─────────────────────────────────────────────────────
    story.append(Paragraph("2.4  Controller–Route–Service File Map", S["sub"]))
    layer_bg = {
        "Route":      colors.HexColor("#dbeafe"),
        "Middleware": colors.HexColor("#fff0ee"),
        "Controller": colors.HexColor("#f0fdf4"),
        "Service":    colors.HexColor("#fefce8"),
        "Data":       colors.HexColor("#f3f4f6"),
    }
    layer_tc = {
        "Route":      colors.HexColor("#1d4ed8"),
        "Middleware": C_CRIMSON,
        "Controller": colors.HexColor("#15803d"),
        "Service":    C_AMBER,
        "Data":       colors.HexColor("#555555"),
    }
    fs = [
        ["Layer", "File", "Responsibility"],
        ["Route",      "server/routes/products.js",           "Declares GET /  pipeline: [Gatekeeper → Controller]"],
        ["Middleware", "server/middleware/validateQuery.js",   "Rejects unknown params & invalid categories with 400. Normalises casing. Calls next() only when valid."],
        ["Controller", "server/controllers/productsController.js", "Extracts req.query.category · calls getProducts() · wraps result in { success, data, meta } · catches throws → 500"],
        ["Service",    "server/services/productsService.js",  "Reads products.json · filters by category (or returns all) · returns { products, total, category }"],
        ["Data",       "data/json/products.json",             "20 shoe products across 6 categories: Casual, Formal, Hiking, Running, Sneakers, Training"],
    ]
    fs_style = TableStyle([
        ("BACKGROUND",    (0,0),(-1, 0), C_SLATE),
        ("TEXTCOLOR",     (0,0),(-1, 0), colors.white),
        ("FONTNAME",      (0,0),(-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),(-1, 0), 9),
        ("LEADING",       (0,0),(-1,-1), 13),
        ("GRID",          (0,0),(-1,-1), 0.4, C_RULE),
        ("LEFTPADDING",   (0,0),(-1,-1), 7),
        ("RIGHTPADDING",  (0,0),(-1,-1), 7),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ])
    fs_rows = [[P(c, bold=True, col=colors.white) for c in fs[0]]]
    for i, r in enumerate(fs[1:], 1):
        layer = r[0]
        fs_rows.append([
            P(r[0], bold=True, col=layer_tc.get(layer, C_INK)),
            Paragraph(f'<font name="Courier" size="7.5">{r[1]}</font>',
                      st("_fc", fontSize=7.5, fontName="Courier", textColor=C_INK, leading=11)),
            P(r[2]),
        ])
        fs_style.add("BACKGROUND", (0,i), (-1,i), layer_bg.get(layer, colors.white))
    story.append(Table(fs_rows, colWidths=[USABLE_W*0.14, USABLE_W*0.36, USABLE_W*0.50], style=fs_style))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════
    # SECTION 3 — Sequence Diagram
    # ════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("03", S["sec_num"]))
    story.append(Paragraph("Sequence Diagram", S["sec_title"]))
    story.append(ColorRule(C_CRIMSON, 2))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "UML sequence diagram showing the full request lifecycle for "
        "GET /api/products?category=Running. Numbered steps correspond to the "
        "lifecycle stages described in the CRS architecture. Alt frames show "
        "branching paths for validation errors and runtime failures.",
        S["body"]
    ))
    story.append(Spacer(1, 10))
    story.append(SequenceDiagram())
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Fig 1. GET /api/products sequence — Client → API Gateway → Express (CRS) → products.json. "
        "Gold numbered circles mark each message step. Dashed arrows are return/response flows. "
        "Alt frames show the Gatekeeper short-circuit (400) and service error (500) branches.",
        S["caption"]
    ))

    # ── Page numbers ─────────────────────────────────────────────────────────
    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#888888"))
        canvas.drawCentredString(A4[0]/2, 1.2*cm,
            f"Stylish — Product Filter API Documentation   ·   Page {doc.page}")
        canvas.setStrokeColor(C_RULE); canvas.setLineWidth(0.4)
        canvas.line(2*cm, 1.5*cm, A4[0]-2*cm, 1.5*cm)
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"✅  PDF written → {OUT}")

if __name__ == "__main__":
    build()
