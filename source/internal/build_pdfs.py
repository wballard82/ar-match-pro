#!/usr/bin/env python3
import os, subprocess, hashlib, json, datetime, re
SRC = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(SRC, '..', '..', 'docs'))
CSS = os.path.join(SRC, 'armp_pdf.css')
REL = "ARMP-2026.07.21-PILOT-AUTH-R3"
REV = datetime.date.today().isoformat()

# source .md -> (output subdir, output filename)
MAP = {
 'README.md': ('release','README.pdf'),
 'ARMP_CHANGELOG.md': ('release','ARMP_CHANGELOG.pdf'),
 'ARMP_KNOWN_LIMITATIONS.md': ('release','ARMP_KNOWN_LIMITATIONS.pdf'),
 'ARMP_ROLLBACK.md': ('release','ARMP_ROLLBACK.pdf'),
 'ARMP_DEPLOYMENT.md': ('release','ARMP_DEPLOYMENT.pdf'),
 'ARMP_PRODUCT_TRUTH.md': ('release','ARMP_PRODUCT_TRUTH.pdf'),
 'ARMP_CLAIMS_REGISTER.md': ('release','ARMP_CLAIMS_REGISTER.pdf'),
 'ARMP_FILE_AUDIT.md': ('release','ARMP_FILE_AUDIT.pdf'),
 'ARMP_CONSISTENCY_MATRIX.md': ('release','ARMP_CONSISTENCY_MATRIX.pdf'),
 'ARMP_ARCHITECTURE.md': ('architecture','ARMP_ARCHITECTURE.pdf'),
 'ARMP_SECURITY_REMEDIATION.md': ('security','ARMP_SECURITY_REMEDIATION.pdf'),
 'ARMP_PILOT_ACCESS_ADMIN_GUIDE.md': ('operations','ARMP_PILOT_ACCESS_ADMIN_GUIDE.pdf'),
 'ARMP_SUPABASE_OWNER_SETUP.md': ('operations','ARMP_SUPABASE_OWNER_SETUP.pdf'),
 'ARMP_SUPPORT_PROCEDURES.md': ('operations','ARMP_SUPPORT_PROCEDURES.pdf'),
 'ARMP_INCIDENT_RESPONSE.md': ('security','ARMP_INCIDENT_RESPONSE.pdf'),
 'ARMP_AUTHENTICATION_TEST_REPORT.md': ('security','ARMP_AUTHENTICATION_TEST_REPORT.pdf'),
 'ARMP_RLS_TEST_REPORT.md': ('security','ARMP_RLS_TEST_REPORT.pdf'),
 'ARMP_DATA_BOUNDARY_TEST_REPORT.md': ('security','ARMP_DATA_BOUNDARY_TEST_REPORT.pdf'),
 'ARMP_STAGING_ACCEPTANCE_REPORT.md': ('release','ARMP_STAGING_ACCEPTANCE_REPORT.pdf'),
}

def render(md_path, pdf_path):
    # pandoc md -> standalone html, then wkhtmltopdf -> pdf
    html = pdf_path + '.html'
    subprocess.run(['pandoc', md_path, '-f','markdown+raw_html','-t','html5','-s',
                    '--metadata','title=','-c', CSS, '-o', html], check=True)
    subprocess.run(['wkhtmltopdf','--enable-local-file-access','--quiet',
                    '--print-media-type','--footer-spacing','3',
                    html, pdf_path], check=True)
    os.remove(html)

def pageinfo(pdf):
    # page count via pdfinfo; text extraction via pdftotext
    n = 0
    try:
        r = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True)
        m = re.search(r'Pages:\s+(\d+)', r.stdout); n = int(m.group(1)) if m else 0
    except Exception: pass
    txt = subprocess.run(['pdftotext', pdf, '-'], capture_output=True, text=True).stdout
    return n, len(txt.strip())

records = []
for md,(sub,out) in MAP.items():
    src = os.path.join(SRC, md)
    if not os.path.exists(src): print("MISSING", md); continue
    od = os.path.join(OUT, sub); os.makedirs(od, exist_ok=True)
    pdf = os.path.join(od, out)
    render(src, pdf)
    n, tlen = pageinfo(pdf)
    sha = hashlib.sha256(open(pdf,'rb').read()).hexdigest()
    records.append({'source':md,'pdf':os.path.relpath(pdf,os.path.join(OUT,'..')),
                    'pages':n,'sha256':sha,'text_chars':tlen,
                    'text_extraction':'PASS' if tlen>200 else 'CHECK'})
    print(f"  {out:42s} {n}p  text={tlen:6d}  {'OK' if tlen>200 else 'THIN'}")

json.dump(records, open(os.path.join(SRC,'_pdf_records.json'),'w'), indent=2)
print(f"\n{len(records)} PDFs built")
