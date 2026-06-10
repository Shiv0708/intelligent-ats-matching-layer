import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export async function extractTextFromUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const data = await pdfParse(buffer);
      const text = (data.text || '').trim();
      if (!text) {
        throw new Error(
          'Could not extract text from this PDF. Try pasting the resume text directly, or re-export the PDF from Word/Google Docs.'
        );
      }
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/bad XRef|XRef|Invalid PDF|corrupt/i.test(msg)) {
        throw new Error(
          'This PDF file is corrupted or not readable (bad XRef entry). ' +
            'Re-save it as a new PDF, or paste the resume text in the text box instead.'
        );
      }
      throw err instanceof Error ? err : new Error(msg);
    }
  }

  if (fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  throw new Error('Unsupported file format. Upload a PDF or DOCX file.');
}
