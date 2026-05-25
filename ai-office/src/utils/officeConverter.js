const HTMLtoDOCX = require('html-to-docx');
const pptxgen = require('pptxgenjs');
const XLSX = require('xlsx');
const { marked } = require('marked');

/**
 * Converts Markdown text to a valid Word Document (.docx) buffer.
 */
async function markdownToDocx(mdText) {
    try {
        const htmlContent = marked.parse(mdText || '');
        
        // Wrap in a clean HTML document with some basic styling
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Arial', sans-serif; line-height: 1.5; font-size: 11pt; color: #333333; }
                    h1 { font-size: 18pt; font-weight: bold; color: #000000; margin-top: 18pt; margin-bottom: 6pt; }
                    h2 { font-size: 14pt; font-weight: bold; color: #333333; margin-top: 14pt; margin-bottom: 4pt; }
                    h3 { font-size: 12pt; font-weight: bold; color: #666666; margin-top: 12pt; margin-bottom: 4pt; }
                    p { margin-bottom: 8pt; text-align: justify; }
                    ul, ol { margin-bottom: 8pt; padding-left: 20px; }
                    li { margin-bottom: 4pt; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; }
                    th, td { border: 1px solid #000000; padding: 6px 8px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
            </html>
        `;

        const fileBuffer = await HTMLtoDOCX(fullHtml, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            header: true,
            pageNumber: true
        });

        return fileBuffer;
    } catch (err) {
        console.error('Error generating docx:', err);
        throw err;
    }
}

/**
 * Converts Markdown text to a valid PowerPoint (.pptx) buffer.
 * Parses slides based on '---' or Heading levels.
 */
async function markdownToPptx(mdText) {
    try {
        const pptx = new pptxgen();
        pptx.layout = 'LAYOUT_16x9';

        // Parse markdown text into individual slide objects
        // Split by horizontal rules (---) or H1 (# )
        const blocks = (mdText || '').split(/(?:\n---\s*\n|\n#\s+)/);
        
        for (let block of blocks) {
            block = block.trim();
            if (!block) continue;

            const lines = block.split('\n');
            let title = '';
            let bodyLines = [];

            // Identify title
            if (lines[0].startsWith('#') || lines[0].startsWith('##') || lines[0].startsWith('###')) {
                title = lines[0].replace(/^#+\s*/, '').trim();
                bodyLines = lines.slice(1);
            } else if (lines[0].length < 60) {
                title = lines[0].trim();
                bodyLines = lines.slice(1);
            } else {
                title = 'Slide';
                bodyLines = lines;
            }

            // Clean title string
            title = title.replace(/[\*_`]/g, '');

            const items = [];
            for (const line of bodyLines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // Check if list item
                if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
                    const txt = trimmed.replace(/^[-*•]\s*/, '').replace(/[\*_`]/g, '').trim();
                    items.push({ text: txt, isBullet: true });
                } else if (/^\d+\.\s+/.test(trimmed)) {
                    const txt = trimmed.replace(/^\d+\.\s*/, '').replace(/[\*_`]/g, '').trim();
                    items.push({ text: txt, isBullet: true });
                } else {
                    const txt = trimmed.replace(/[\*_`]/g, '').trim();
                    items.push({ text: txt, isBullet: false });
                }
            }

            // Add slide to presentation
            const slide = pptx.addSlide();
            
            // Background color (matching cream theme of UI)
            slide.background = { color: 'F4F0EA' };

            // Add slide border (neobrutalist 3pt black border)
            slide.addShape(pptx.ShapeType.rect, { 
                x: 0.15, 
                y: 0.15, 
                w: 9.7, 
                h: 5.32, 
                fill: { color: 'none' }, 
                line: { color: '000000', width: 3 } 
            });

            // Add Slide Title
            slide.addText(title, {
                x: 0.6,
                y: 0.4,
                w: 8.8,
                h: 0.8,
                fontSize: 26,
                bold: true,
                fontFace: 'Arial',
                color: '000000',
                valign: 'middle'
            });

            // Format body content
            const textObjects = items.map(item => ({
                text: item.text + '\n',
                options: {
                    bullet: item.isBullet,
                    fontSize: 15,
                    color: '333333',
                    fontFace: 'Arial',
                    paraSpaceAfter: 8
                }
            }));

            if (textObjects.length > 0) {
                slide.addText(textObjects, {
                    x: 0.6,
                    y: 1.4,
                    w: 8.8,
                    h: 3.7,
                    valign: 'top'
                });
            } else {
                slide.addText('(No content)', {
                    x: 0.6,
                    y: 1.4,
                    w: 8.8,
                    h: 3.7,
                    valign: 'top',
                    fontSize: 14,
                    color: '666666',
                    italic: true
                });
            }
        }

        const buffer = await pptx.write('nodebuffer');
        return buffer;
    } catch (err) {
        console.error('Error generating pptx:', err);
        throw err;
    }
}

/**
 * Converts Markdown table or text data into a valid Excel (.xlsx) buffer.
 */
async function tableToXlsx(mdText) {
    try {
        const lines = (mdText || '').split('\n');
        const rows = [];

        // Parse markdown table
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('|')) continue;
            
            // Skip divider rows e.g. |---|---|
            if (/^[|:\-\s]+$/.test(trimmed)) continue;
            
            const cells = trimmed.split('|')
                .slice(1, -1) // remove empty cells at start & end
                .map(c => c.trim());
            
            rows.push(cells);
        }

        // Fallback: if no markdown table found, treat each line as a single cell
        if (rows.length === 0) {
            for (const line of lines) {
                if (line.trim()) {
                    rows.push([line.trim()]);
                }
            }
        }

        const wb = XLSX.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Optional: Autofit column widths
        const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
        const colWidths = Array(maxCols).fill({ wch: 15 });
        for (const row of rows) {
            for (let i = 0; i < row.length; i++) {
                const cellVal = String(row[i] || '');
                if (cellVal.length > colWidths[i].wch) {
                    colWidths[i] = { wch: Math.min(cellVal.length + 3, 50) };
                }
            }
        }
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Data');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return buffer;
    } catch (err) {
        console.error('Error generating xlsx:', err);
        throw err;
    }
}

module.exports = {
    markdownToDocx,
    markdownToPptx,
    tableToXlsx
};
