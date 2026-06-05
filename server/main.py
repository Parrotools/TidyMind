"""
TidyMind PDF Export Server
FastAPI + reportlab，支持中文，返回 PDF 下载链接
"""

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus.flowables import Flowable
import reportlab.lib.colors as colors

# ── 字体初始化 ─────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
EXPORTS_DIR = BASE_DIR / "exports"
EXPORTS_DIR.mkdir(exist_ok=True)
FONTS_DIR = BASE_DIR / "fonts"

# 尝试加载中文字体，按优先级查找
ZH_FONT = "Helvetica"  # fallback
FONT_BOLD = "Helvetica-Bold"

def _init_fonts():
    global ZH_FONT, FONT_BOLD
    font_candidates = [
        FONTS_DIR / "NotoSansSC-Regular.ttf",
        FONTS_DIR / "SourceHanSansSC-Regular.otf",
        FONTS_DIR / "PingFang.ttf",
        FONTS_DIR / "wqy-microhei.ttc",
        # 系统字体路径（Windows）
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simsun.ttc"),
        # macOS 系统字体
        Path("/System/Library/Fonts/PingFang.ttc"),
        Path("/System/Library/Fonts/STHeiti Light.ttc"),
        # Linux 系统字体
        Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
        Path("/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf"),
    ]
    for fp in font_candidates:
        if fp.exists():
            try:
                pdfmetrics.registerFont(TTFont("TidyMindZH", str(fp)))
                ZH_FONT = "TidyMindZH"
                pdfmetrics.registerFont(TTFont("TidyMindZH-Bold", str(fp)))
                FONT_BOLD = "TidyMindZH-Bold"
                print(f"[OK] 中文字体已加载: {fp}")
                return
            except Exception as e:
                print(f"[WARN] 字体加载失败 {fp}: {e}")
                continue
    print("[WARN] 未找到中文字体文件，将使用 Helvetica（中文可能显示为方块）")
    print("[INFO] 请将中文字体 .ttf 文件放入 server/fonts/ 目录")

_init_fonts()

# ── 颜色 ──────────────────────────────────────────────────────────

PRIMARY = HexColor("#6750A4")
BG_SURFACE = HexColor("#FFFBFE")
TEXT_PRIMARY = HexColor("#1C1B1F")
TEXT_SECONDARY = HexColor("#49454F")
TEXT_MUTED = HexColor("#938F99")
BORDER = HexColor("#CAC4D0")
ACCENT_BLUE = HexColor("#2563eb")
ACCENT_GREEN = HexColor("#22c55e")
ACCENT_ORANGE = HexColor("#f97316")
ACCENT_YELLOW = HexColor("#eab308")
BG_BLUE = HexColor("#f0f4ff")
BG_GREEN = HexColor("#f0fdf4")
BG_ORANGE = HexColor("#fff7ed")
BG_YELLOW = HexColor("#fefce8")
BG_CODE = HexColor("#f7f7f7")
BG_QUOTE = HexColor("#f9f9f9")

# ── FastAPI ────────────────────────────────────────────────────────

app = FastAPI(title="TidyMind PDF Export", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务（供下载）
app.mount("/exports", StaticFiles(directory=str(EXPORTS_DIR)), name="exports")

# ── 数据模型 ──────────────────────────────────────────────────────

class BlockItem(BaseModel):
    type: str
    text: Optional[str] = None
    level: Optional[int] = None
    heading: Optional[str] = None
    paragraphs: Optional[List[str]] = None
    content: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = None
    items: Optional[List[str]] = None
    style: Optional[str] = None
    headers: Optional[List[str]] = None
    rows: Optional[List[List[str]]] = None
    source: Optional[str] = None
    src: Optional[str] = None

class ExportRequest(BaseModel):
    title: str
    tag: Optional[str] = None
    summary: Optional[str] = None
    keyPoints: Optional[List[str]] = None
    blocks: Optional[List[BlockItem]] = None
    content: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

# ── 样式 ──────────────────────────────────────────────────────────

PAGE_W, PAGE_H = A4
BODY_W = PAGE_W - 2 * inch  # 左右各 1 inch 边距

styles = getSampleStyleSheet()

h1_style = ParagraphStyle("H1_ZH", fontName=FONT_BOLD, fontSize=24, leading=32, textColor=TEXT_PRIMARY, spaceAfter=6, spaceBefore=0)
h2_style = ParagraphStyle("H2_ZH", fontName=FONT_BOLD, fontSize=18, leading=26, textColor=TEXT_PRIMARY, spaceAfter=6, spaceBefore=28)
h3_style = ParagraphStyle("H3_ZH", fontName=FONT_BOLD, fontSize=15, leading=22, textColor=TEXT_PRIMARY, spaceAfter=4, spaceBefore=20)
body_style = ParagraphStyle("Body_ZH", fontName=ZH_FONT, fontSize=12, leading=20, textColor=TEXT_PRIMARY, spaceAfter=10)
meta_style = ParagraphStyle("Meta", fontName=ZH_FONT, fontSize=10, leading=16, textColor=TEXT_MUTED)
tag_style = ParagraphStyle("Tag", fontName=ZH_FONT, fontSize=9, leading=14, textColor=HexColor("#1D192B"), backColor=HexColor("#E8DEF8"))
summary_lbl = ParagraphStyle("SmLbl", fontName=FONT_BOLD, fontSize=11, leading=16, textColor=ACCENT_BLUE, spaceAfter=6)
summary_txt = ParagraphStyle("SmTxt", fontName=ZH_FONT, fontSize=11, leading=18, textColor=TEXT_PRIMARY)
kp_lbl = ParagraphStyle("KpLbl", fontName=FONT_BOLD, fontSize=11, leading=16, textColor=TEXT_PRIMARY, spaceAfter=10)
kp_txt = ParagraphStyle("KpTxt", fontName=ZH_FONT, fontSize=11, leading=17, textColor=TEXT_PRIMARY)
quote_style = ParagraphStyle("Quote", fontName=ZH_FONT, fontSize=11, leading=18, textColor=TEXT_SECONDARY, leftIndent=12)
tip_style = ParagraphStyle("Tip", fontName=ZH_FONT, fontSize=11, leading=17, textColor=HexColor("#166534"))
warn_style = ParagraphStyle("Warn", fontName=ZH_FONT, fontSize=11, leading=17, textColor=HexColor("#9a3412"))
code_style = ParagraphStyle("Code", fontName="Courier", fontSize=9, leading=14, textColor=TEXT_PRIMARY)
footer_style = ParagraphStyle("Footer", fontName=ZH_FONT, fontSize=8, leading=12, textColor=TEXT_MUTED, alignment=1)

# ── 构建 PDF ──────────────────────────────────────────────────────

def block_to_flowable(b: BlockItem) -> List[Flowable]:
    """将单个 Block 转换为 reportlab Flowable 列表"""
    flows: List[Flowable] = []

    if b.type == "heading":
        lv = b.level or 1
        st = h1_style if lv == 1 else h2_style if lv == 2 else h3_style
        txt = b.text or b.heading or ""
        flows.append(Paragraph(txt.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"), st))

    elif b.type == "paragraph":
        txt = b.text or ""
        flows.append(Paragraph(txt.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"), body_style))

    elif b.type == "section":
        h = b.heading or ""
        flows.append(Paragraph(h.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"), h2_style))
        for p in (b.paragraphs or []):
            flows.append(Paragraph(p.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"), body_style))

    elif b.type == "quote":
        txt = b.text or ""
        tbl = Table([[Paragraph(f"「{txt}」", quote_style)]], colWidths=[BODY_W - 12])
        tbl.setStyle(TableStyle([
            ("LEFTPADDING", (0,0), (-1,-1), 10),
            ("RIGHTPADDING", (0,0), (-1,-1), 10),
            ("TOPPADDING", (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ("BACKGROUND", (0,0), (-1,-1), BG_QUOTE),
            ("LINEBEFORE", (0,0), (0,0), 3, PRIMARY),
            ("LINEBELOW", (0,0), (-1,-1), 0.5, BORDER),
            ("LINEABOVE", (0,0), (-1,-1), 0.5, BORDER),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ]))
        flows.append(tbl)
        if b.source:
            flows.append(Paragraph(f"—— {b.source}", meta_style))

    elif b.type == "tip":
        txt = b.text or ""
        tbl = Table([[Paragraph(f"💡 {txt}", tip_style)]], colWidths=[BODY_W - 14])
        tbl.setStyle(TableStyle([
            ("LEFTPADDING", (0,0), (-1,-1), 12),
            ("RIGHTPADDING", (0,0), (-1,-1), 12),
            ("TOPPADDING", (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ("BACKGROUND", (0,0), (-1,-1), BG_GREEN),
            ("LINEBEFORE", (0,0), (0,0), 4, ACCENT_GREEN),
        ]))
        flows.append(tbl)

    elif b.type == "warning":
        txt = b.text or ""
        tbl = Table([[Paragraph(f"⚠️ {txt}", warn_style)]], colWidths=[BODY_W - 14])
        tbl.setStyle(TableStyle([
            ("LEFTPADDING", (0,0), (-1,-1), 12),
            ("RIGHTPADDING", (0,0), (-1,-1), 12),
            ("TOPPADDING", (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ("BACKGROUND", (0,0), (-1,-1), BG_ORANGE),
            ("LINEBEFORE", (0,0), (0,0), 4, ACCENT_ORANGE),
        ]))
        flows.append(tbl)

    elif b.type == "conclusion":
        txt = b.text or ""
        tbl = Table([[Paragraph(f"📌 总结", h3_style), Paragraph(txt, body_style)]], colWidths=[BODY_W - 14])
        tbl.setStyle(TableStyle([
            ("LEFTPADDING", (0,0), (-1,-1), 12),
            ("RIGHTPADDING", (0,0), (-1,-1), 12),
            ("TOPPADDING", (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("BACKGROUND", (0,0), (-1,-1), BG_YELLOW),
            ("LINEBEFORE", (0,0), (0,0), 4, ACCENT_YELLOW),
        ]))
        flows.append(tbl)

    elif b.type == "example":
        h = b.heading or "案例"
        c = b.content or ""
        tbl = Table([[Paragraph(f"📝 {h}", ParagraphStyle("ExH", fontName=FONT_BOLD, fontSize=11, textColor=HexColor("#1d4ed8"))), Paragraph(c, body_style)]], colWidths=[BODY_W - 14])
        tbl.setStyle(TableStyle([
            ("LEFTPADDING", (0,0), (-1,-1), 12),
            ("RIGHTPADDING", (0,0), (-1,-1), 12),
            ("TOPPADDING", (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("BACKGROUND", (0,0), (-1,-1), BG_BLUE),
            ("LINEBEFORE", (0,0), (0,0), 4, ACCENT_BLUE),
        ]))
        flows.append(tbl)

    elif b.type == "list":
        for i, item in enumerate(b.items or []):
            marker = f"{i+1}." if b.style == "number" else "•"
            flows.append(Paragraph(f"{marker} {item}", body_style))

    elif b.type == "table":
        data = [b.headers or []] + (b.rows or [])
        t = Table(data, colWidths=[BODY_W / max(len(b.headers or [1]), 1)] * max(len(b.headers or [1]), 1))
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), BG_CODE),
            ("TEXTCOLOR", (0,0), (-1,0), TEXT_PRIMARY),
            ("FONTNAME", (0,0), (-1,0), FONT_BOLD),
            ("FONTSIZE", (0,0), (-1,-1), 10),
            ("FONTNAME", (0,1), (-1,-1), ZH_FONT),
            ("GRID", (0,0), (-1,-1), 0.5, BORDER),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [HexColor("#ffffff"), HexColor("#fafafa")]),
            ("TOPPADDING", (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ("LEFTPADDING", (0,0), (-1,-1), 8),
            ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ]))
        flows.append(tbl)

    elif b.type == "code":
        txt = b.code or ""
        lang = b.language or ""
        if lang:
            flows.append(Paragraph(lang.upper(), ParagraphStyle("Lang", fontName="Courier", fontSize=8, textColor=TEXT_MUTED, spaceAfter=4)))
        tbl = Table([[Paragraph(txt.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"), code_style)]], colWidths=[BODY_W - 24])
        tbl.setStyle(TableStyle([
            ("LEFTPADDING", (0,0), (-1,-1), 12),
            ("RIGHTPADDING", (0,0), (-1,-1), 12),
            ("TOPPADDING", (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("BACKGROUND", (0,0), (-1,-1), BG_CODE),
            ("LINEBELOW", (0,0), (-1,-1), 0.5, BORDER),
            ("LINEABOVE", (0,0), (-1,-1), 0.5, BORDER),
        ]))
        flows.append(tbl)

    elif b.type == "divider":
        flows.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=20, spaceBefore=20))

    if flows:
        flows.append(Spacer(1, 6))
    return flows


def generate_pdf(req: ExportRequest) -> Path:
    """生成 PDF 并返回文件路径"""
    filename = f"{uuid.uuid4().hex}.pdf"
    filepath = EXPORTS_DIR / filename

    doc = SimpleDocTemplate(
        str(filepath), pagesize=A4,
        leftMargin=inch, rightMargin=inch,
        topMargin=0.8 * inch, bottomMargin=0.8 * inch,
        title=req.title, author="TidyMind",
    )

    story: List[Flowable] = []

    # ── 标题 ──
    story.append(Paragraph(req.title.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"), h1_style))

    # ── 元信息 ──
    meta_parts = []
    if req.tag:
        meta_parts.append(req.tag)
    if req.updatedAt:
        try:
            dt = datetime.fromisoformat(req.updatedAt.replace("Z","+00:00"))
            meta_parts.append(dt.strftime("%Y-%m-%d %H:%M"))
        except:
            pass
    if meta_parts:
        story.append(Paragraph(" · ".join(meta_parts), meta_style))

    story.append(HRFlowable(width="100%", thickness=1.5, color=BORDER, spaceAfter=16, spaceBefore=8))

    # ── 摘要 ──
    if req.summary:
        tbl = Table([[Paragraph("📋 核心摘要", summary_lbl), Paragraph(req.summary, summary_txt)]], colWidths=[BODY_W - 28])
        tbl.setStyle(TableStyle([
            ("LEFTPADDING", (0,0), (-1,-1), 14),
            ("RIGHTPADDING", (0,0), (-1,-1), 14),
            ("TOPPADDING", (0,0), (-1,-1), 12),
            ("BOTTOMPADDING", (0,0), (-1,-1), 12),
            ("BACKGROUND", (0,0), (-1,-1), BG_BLUE),
            ("LINEBEFORE", (0,0), (0,0), 4, ACCENT_BLUE),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
        ]))
        story.append(tbl)

    # ── 关键要点 ──
    if req.keyPoints:
        kp_data = [[Paragraph("🔑 关键要点", kp_lbl)]]
        for i, kp in enumerate(req.keyPoints):
            kp_data.append([Paragraph(f"{i+1}. {kp}", kp_txt)])
        tbl = Table(kp_data, colWidths=[BODY_W - 28])
        tbl.setStyle(TableStyle([
            ("LEFTPADDING", (0,0), (-1,-1), 14),
            ("RIGHTPADDING", (0,0), (-1,-1), 14),
            ("TOPPADDING", (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("BACKGROUND", (0,0), (-1,-1), BG_SURFACE),
            ("LINEBELOW", (0,0), (-1,-1), 0.5, BORDER),
            ("LINEABOVE", (0,0), (-1,-1), 0.5, BORDER),
            ("LINEBEFORE", (0,0), (-1,-1), 0.5, BORDER),
            ("LINEAFTER", (0,0), (-1,-1), 0.5, BORDER),
        ]))
        story.append(tbl)

    # ── 正文 Blocks ──
    if req.blocks:
        for b in req.blocks:
            flows = block_to_flowable(b)
            if flows:
                story.extend(flows)
    elif req.content:
        # 纯文本降级
        for para in (req.content or "").split("\n\n"):
            if para.strip():
                story.append(Paragraph(para.strip(), body_style))

    # ── 页脚 ──
    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(ZH_FONT, 8)
        canvas.setFillColor(TEXT_MUTED)
        canvas.drawCentredString(PAGE_W / 2, 0.5 * inch, f"Generated by TidyMind · {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    return filepath


# ── API ────────────────────────────────────────────────────────────

@app.post("/export/pdf")
async def export_pdf(req: ExportRequest):
    try:
        filepath = generate_pdf(req)
        filename = filepath.name
        download_url = f"/exports/{filename}"
        return {
            "success": True,
            "filename": filename,
            "download_url": download_url,
            "message": "PDF 生成成功",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 生成失败: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok", "fonts": {"zh": ZH_FONT, "bold": FONT_BOLD}}

# ── 启动 ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print(f"[TidyMind PDF Server] 启动中...")
    print(f"[导出目录] {EXPORTS_DIR}")
    print(f"[中文字体] {ZH_FONT}")
    uvicorn.run(app, host="0.0.0.0", port=8123, log_level="info")
