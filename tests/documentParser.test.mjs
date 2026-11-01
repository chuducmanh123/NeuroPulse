import { test, describe } from "node:test";
import assert from "node:assert";
import zlib from "zlib";
import {
  extractTextFromDocument,
  extractTextFromDocx,
  extractTextFromDoc,
  extractTextFromPdfNative,
  docxXmlToMarkdown,
} from "../src/lib/neuroguide/documentParser.ts";
import { parseNotebookLMContent } from "../src/lib/neuroguide/notebooklmParser.ts";

describe("Document Parser Engine for NotebookLM Ingestion", () => {
  test("should convert DOCX XML tables and headings to clean Markdown", () => {
    const xml = `
      <w:p><w:pStyle w:val="Heading1"/><w:t>2024 AHA Stroke Guideline</w:t></w:p>
      <w:p><w:t>Clinical recommendations for acute reperfusion.</w:t></w:p>
      <w:tbl>
        <w:tr>
          <w:tc><w:p><w:t>Clinical Domain / Topic</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>Guideline Recommendation</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>Class (COR) &amp; Level (LOE)</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>Related Studies &amp; Evidence</w:t></w:p></w:tc>
        </w:tr>
        <w:tr>
          <w:tc><w:p><w:t>Acute Ischemic Stroke</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>Intravenous thrombolysis is recommended within 4.5 hours of symptom onset.</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>Class 1 LOE A</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>NINDS 1995, ECASS III 2008</w:t></w:p></w:tc>
        </w:tr>
      </w:tbl>
    `;

    const md = docxXmlToMarkdown(xml);
    assert.ok(md.includes("# 2024 AHA Stroke Guideline"));
    assert.ok(md.includes("| Clinical Domain / Topic | Guideline Recommendation |"));
    assert.ok(md.includes("| Acute Ischemic Stroke | Intravenous thrombolysis is recommended within 4.5 hours of symptom onset. | Class 1 LOE A | NINDS 1995, ECASS III 2008 |"));

    const parsed = parseNotebookLMContent(md);
    assert.strictEqual(parsed.stats.totalRecommendations, 1);
    assert.strictEqual(parsed.doc.allPracticeChanges[0].topic, "Acute Ischemic Stroke");
    assert.strictEqual(parsed.doc.allPracticeChanges[0].currentGrade, "Class 1, Level A");
  });

  test("should extract text from a real DOCX zip archive buffer", async () => {
    const xmlContent = `
      <w:p><w:pStyle w:val="Title"/><w:t>AHA Stroke Recommendations</w:t></w:p>
      <w:tbl>
        <w:tr>
          <w:tc><w:p><w:t>Domain</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>Recommendation</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>Class &amp; Level</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>Evidence</w:t></w:p></w:tc>
        </w:tr>
        <w:tr>
          <w:tc><w:p><w:t>Endovascular Therapy</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>Mechanical thrombectomy is recommended for LVO up to 24 hours.</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>Class 1 LOE A</w:t></w:p></w:tc>
          <w:tc><w:p><w:t>DAWN 2018, DEFUSE-3 2018</w:t></w:p></w:tc>
        </w:tr>
      </w:tbl>
    `;

    const fileData = zlib.deflateRawSync(Buffer.from(xmlContent, "utf-8"));
    const fileName = Buffer.from("word/document.xml", "utf-8");
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); // signature
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(8, 8); // Deflate
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt32LE(0, 14);
    header.writeUInt32LE(fileData.length, 18);
    header.writeUInt32LE(Buffer.byteLength(xmlContent), 22);
    header.writeUInt16LE(fileName.length, 26);
    header.writeUInt16LE(0, 28);

    const docxBuffer = Buffer.concat([header, fileName, fileData]);
    const { text, format } = await extractTextFromDocument(docxBuffer, "stroke_guideline.docx");

    assert.strictEqual(format, "docx");
    assert.ok(text.includes("Mechanical thrombectomy is recommended for LVO up to 24 hours."));

    const parsed = parseNotebookLMContent(text);
    assert.strictEqual(parsed.stats.totalRecommendations, 1);
    assert.strictEqual(parsed.doc.allPracticeChanges[0].topic, "Endovascular Therapy");
  });

  test("should extract text from native compressed PDF buffer", async () => {
    const streamBody = `
      BT
      /F1 12 Tf
      50 700 Td (2024 ESO Practice Guideline) Tj T*
      (Clinical Domain | Recommendation | Class & Level | Trials) Tj T*
      (Secondary Prevention | Dual antiplatelet for 21 days | Class 1 LOE A | CHANCE, POINT) Tj
      ET
    `;
    const compressed = zlib.deflateSync(Buffer.from(streamBody, "latin1"));
    const pdfBuffer = Buffer.concat([
      Buffer.from("%PDF-1.4\n1 0 obj\n<< /Length " + compressed.length + " /Filter /FlateDecode >>\nstream\n"),
      compressed,
      Buffer.from("\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"),
    ]);

    const { text, format } = await extractTextFromDocument(pdfBuffer, "eso_guideline.pdf");
    assert.strictEqual(format, "pdf");
    assert.ok(text.includes("Secondary Prevention"));
    assert.ok(text.includes("Dual antiplatelet for 21 days"));
  });

  test("should handle legacy Word .doc format", async () => {
    const htmlDoc = `
      <html>
        <body>
          <h1>AAN Guideline for Epilepsy</h1>
          <table>
            <tr><td>Domain</td><td>Recommendation</td><td>COR/LOE</td><td>Evidence</td></tr>
            <tr><td>Seizure Management</td><td>Levetiracetam is recommended as initial monotherapy</td><td>Class 1 LOE A</td><td>SANAD II</td></tr>
          </table>
        </body>
      </html>
    `;
    const docBuffer = Buffer.from(htmlDoc, "utf-8");
    const { text, format } = await extractTextFromDocument(docBuffer, "epilepsy.doc");

    assert.strictEqual(format, "doc");
    assert.ok(text.includes("Levetiracetam is recommended as initial monotherapy"));
  });
});
