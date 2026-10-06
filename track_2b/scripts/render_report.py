"""Generate the required report PDF from technical_report.md (ReportLab)."""
from pathlib import Path
from html import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from pypdf import PdfReader

root=Path(__file__).resolve().parents[1]
target=root/'KampungSambau_Report.pdf'
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='ReportBody',fontName='Helvetica',fontSize=10,leading=14,spaceAfter=8))
styles.add(ParagraphStyle(name='ReportTitle',fontName='Helvetica-Bold',fontSize=23,leading=28,spaceAfter=15,textColor=HexColor('#25473e')))
styles.add(ParagraphStyle(name='ReportHeading',fontName='Helvetica-Bold',fontSize=13,leading=17,spaceBefore=12,spaceAfter=7,keepWithNext=True,textColor=HexColor('#25473e')))
styles.add(ParagraphStyle(name='ReportSubheading',parent=styles['ReportHeading'],fontSize=10.5,leading=14))
story=[]
for block in (root/'technical_report.md').read_text().strip().split('\n\n'):
    if block.startswith('# '):style='ReportTitle';block=block[2:]
    elif block.startswith('### '):style='ReportSubheading';block=block[4:]
    elif block.startswith('## '):style='ReportHeading';block=block[3:]
    else:style='ReportBody'
    story.append(Paragraph(escape(block).replace('\n','<br/>'),styles[style]))
def footer(canvas,doc):
    canvas.setFont('Helvetica',8);canvas.setFillColor(HexColor('#667770'))
    canvas.drawString(44,27,'KAMPUNG SAMBAU  |  TRACK 2B  |  SUBMISSION DRAFT')
    canvas.drawRightString(551,27,str(doc.page))
doc=SimpleDocTemplate(str(target),pagesize=(595,842),rightMargin=44,leftMargin=44,topMargin=42,bottomMargin=48,title='Kampung Sambau - Technical Report',author='KampungSambau')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
pages=len(PdfReader(target).pages)
assert pages<=6,f'Report has {pages} pages; maximum is 6'
print(f'{target.name}: {pages} pages')
