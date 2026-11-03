# Generates the small vacancy fixtures for tests/unit/server/parse-vacancy.test.ts.
# One-off: run `python3 tests/fixtures/vacancy/generate.py` after changing it and commit the output.
import pathlib
import zipfile

HERE = pathlib.Path(__file__).parent

LINES = [
    'Senior Frontend Engineer at Acme',
    'Requirements: 5+ years with Vue 3 and TypeScript, Nuxt, REST APIs.',
    'Nice to have: Node.js, Playwright, experience in fintech products.',
    'Remote work from any timezone between UTC+0 and UTC+4.',
    'English B2 or higher. Full-time contract, start within a month.',
    'You will build the customer dashboard together with designers and backend engineers.',
]
TEXT = '\n'.join(LINES)


def pdf(lines):
    content = 'BT /F1 11 Tf 50 780 Td 14 TL ' + ' '.join(f'({line}) Tj T*' for line in lines) + ' ET'
    objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        f'<< /Length {len(content)} >>\nstream\n{content}\nendstream',
    ]
    out = '%PDF-1.4\n'
    offsets = []
    for number, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += f'{number} 0 obj\n{body}\nendobj\n'
    xref = len(out)
    out += f'xref\n0 {len(objects) + 1}\n0000000000 65535 f \n'
    out += ''.join(f'{offset:010d} 00000 n \n' for offset in offsets)
    out += f'trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'
    return out.encode('latin-1')


def docx(path, document_xml):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        z.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        z.writestr('word/document.xml', document_xml)


paragraphs = ''.join(f'<w:p><w:r><w:t>{line}</w:t></w:r></w:p>' for line in LINES)
document = f'<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{paragraphs}</w:body></w:document>'

(HERE / 'vacancy.pdf').write_bytes(pdf(LINES))
(HERE / 'blank.pdf').write_bytes(pdf([]))
docx(HERE / 'vacancy.docx', document)
docx(HERE / 'broken.docx', '<w:document><w:body><w:p>')
(HERE / 'vacancy.md').write_text('# ' + LINES[0] + '\n\n' + '\n\n'.join(LINES[1:]) + '\n')
(HERE / 'vacancy.txt').write_text(TEXT + '\n')
(HERE / 'fake.pdf').write_text('This is plain text pretending to be a PDF.\n')
