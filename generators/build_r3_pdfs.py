#!/usr/bin/env python3
import os, subprocess
REL="ARMP-2026.07.21-PILOT-AUTH-R3"; DATE="2026-07-22"
SRC="source/internal"; OUT="docs/release"
os.makedirs(OUT, exist_ok=True)
CSS="""@page{margin:22mm 18mm 20mm 18mm}*{font-family:'Helvetica Neue',Arial,sans-serif}
body{color:#0F172A;font-size:10.5pt;line-height:1.5}
h1{color:#0B7EA8;font-size:19pt;border-bottom:3px solid #14A8D8;padding-bottom:6px;margin:0 0 4px}
h2{color:#0F172A;font-size:13.5pt;margin-top:18px;border-left:4px solid #14A8D8;padding-left:9px}
h3{color:#334155;font-size:11.5pt;margin-top:14px}
table{border-collapse:collapse;width:100%;margin:10px 0;font-size:9.3pt}
th{background:#0D1B2E;color:#fff;text-align:left;padding:6px 8px}
td{border:1px solid #CBD5E1;padding:5px 8px;vertical-align:top}
tr:nth-child(even) td{background:#F1F5F9}
code{background:#EEF2F7;padding:1px 4px;border-radius:3px;font-family:Consolas,monospace;font-size:9pt}
.brand{color:#64748B;font-size:8.5pt;letter-spacing:.5px}strong{color:#0B4A63}"""
def hdr():
    return (f'<div style="border-bottom:1px solid #E2E8F0;padding-bottom:4px;margin-bottom:10px">'
            f'<span style="font-weight:800;color:#0B7EA8">AR Match Pro</span>'
            f'<span class="brand"> &nbsp;·&nbsp; {REL} &nbsp;·&nbsp; Revised {DATE}</span></div>')
def build(md):
    slug=os.path.basename(md).replace('.md','')
    pdf=os.path.join(OUT,slug+'.pdf')
    body=subprocess.run(['pandoc',md,'-f','markdown','-t','html'],capture_output=True,text=True).stdout
    html=f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{hdr()}{body}</body></html>"
    tmp=f'/tmp/{slug}.html'; open(tmp,'w').write(html)
    subprocess.run(['wkhtmltopdf','--enable-local-file-access',
        '--footer-right','[page]','--footer-font-size','7','--footer-spacing','4',
        tmp,pdf],check=True,capture_output=True)
    return pdf
docs=["README.md","ARMP_CHANGELOG.md","ARMP_TEST_RESULTS.md","ARMP_AUTHENTICATION_TEST_REPORT.md",
 "ARMP_RLS_TEST_REPORT.md","ARMP_DATA_BOUNDARY_TEST_REPORT.md","ARMP_STAGING_ACCEPTANCE_REPORT.md",
 "ARMP_ARCHITECTURE.md","ARMP_SECURITY_REMEDIATION.md","ARMP_KNOWN_LIMITATIONS.md","ARMP_PRODUCT_TRUTH.md",
 "ARMP_CLAIMS_REGISTER.md","ARMP_CONSISTENCY_MATRIX.md","ARMP_SUPABASE_OWNER_SETUP.md",
 "ARMP_PILOT_ACCESS_ADMIN_GUIDE.md","ARMP_SUPPORT_PROCEDURES.md","ARMP_INCIDENT_RESPONSE.md",
 "ARMP_DEPLOYMENT.md","ARMP_ROLLBACK.md"]
n=0
for fn in docs:
    p=os.path.join(SRC,fn)
    if os.path.exists(p): build(p); n+=1; print("built",fn.replace('.md','.pdf'))
print(f"\n{n} PDFs built")
