import zlib from "zlib";
import fs from "fs";
import path from "path";

function loadGeminiApiKey(): string {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    try {
      const raw = fs.readFileSync(envPath, "utf-8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("GEMINI_API_KEY=")) {
          const val = trimmed.slice("GEMINI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
          if (val) return val;
        }
      }
    } catch {
      // Ignore
    }
  }
  return (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
}

/**
 * Extract a specific file from a ZIP buffer in memory without external libraries.
 */
function extractFileFromZip(zipBuffer: Buffer, targetFileName: string): Buffer | null {
  let offset = 0;
  const maxLen = zipBuffer.length;

  while (offset < maxLen - 30) {
    const signature = zipBuffer.readUInt32LE(offset);
    if (signature === 0x04034b50) {
      // Local file header
      const compressionMethod = zipBuffer.readUInt16LE(offset + 8);
      const compressedSize = zipBuffer.readUInt32LE(offset + 18);
      const uncompressedSize = zipBuffer.readUInt32LE(offset + 22);
      const fileNameLength = zipBuffer.readUInt16LE(offset + 26);
      const extraFieldLength = zipBuffer.readUInt16LE(offset + 28);

      const fileName = zipBuffer.toString("utf-8", offset + 30, offset + 30 + fileNameLength);
      const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

      if (fileName === targetFileName) {
        if (compressionMethod === 0) {
          // Stored uncompressed
          return zipBuffer.subarray(dataOffset, dataOffset + uncompressedSize);
        } else if (compressionMethod === 8) {
          // Deflate compressed
          const compressedData = zipBuffer.subarray(dataOffset, dataOffset + compressedSize);
          try {
            return zlib.inflateRawSync(compressedData);
          } catch {
            try {
              return zlib.inflateSync(compressedData);
            } catch {
              return null;
            }
          }
        }
      }

      if (compressedSize > 0) {
        offset = dataOffset + compressedSize;
      } else {
        offset += 30 + fileNameLength + extraFieldLength + 1;
      }
    } else if (signature === 0x02014b50 || signature === 0x06054b50) {
      break;
    } else {
      offset++;
    }
  }
  return null;
}

/**
 * Convert Word document.xml to structured Markdown (tables, headings, paragraphs)
 */
export function docxXmlToMarkdown(xmlStr: string): string {
  let markdown = xmlStr;

  // 1. Process tables: <w:tbl>...</w:tbl>
  markdown = markdown.replace(/<w:tbl[\s\S]*?<\/w:tbl>/g, (tblXml) => {
    const rows: string[][] = [];
    const trMatches = tblXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];

    for (const trXml of trMatches) {
      const tcMatches = trXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
      const rowCells: string[] = [];

      for (const tcXml of tcMatches) {
        // Collect text inside all <w:t> tags in this cell
        const tMatches = tcXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
        const cellText = tMatches
          .map((t) => t.replace(/<w:t[^>]*>|<\/w:t>/g, ""))
          .join(" ")
          .replace(/[\r\n\t]+/g, " ")
          .replace(/\|/g, "\\|")
          .trim();

        rowCells.push(cellText);
      }

      if (rowCells.some((c) => c.length > 0)) {
        rows.push(rowCells);
      }
    }

    if (rows.length === 0) return "";

    // Normalize column counts
    const maxCols = Math.max(...rows.map((r) => r.length));
    const normalizedRows = rows.map((r) => {
      while (r.length < maxCols) r.push("");
      return r;
    });

    let res = "\n";
    normalizedRows.forEach((row, idx) => {
      res += `| ${row.join(" | ")} |\n`;
      if (idx === 0) {
        res += `| ${row.map(() => "---").join(" | ")} |\n`;
      }
    });
    return res + "\n";
  });

  // 2. Process paragraphs: <w:p>...</w:p>
  markdown = markdown.replace(/<w:p[\s\S]*?<\/w:p>/g, (pXml) => {
    const isHeading = /<w:pStyle\s+w:val="(?:Heading|Title)(\d)?"/i.test(pXml);
    const headingLevel = RegExp.$1 ? parseInt(RegExp.$1, 10) : 2;

    const tMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    const text = tMatches
      .map((t) => t.replace(/<w:t[^>]*>|<\/w:t>/g, ""))
      .join("")
      .trim();

    if (!text) return "";
    if (isHeading) {
      return `\n${"#".repeat(Math.min(headingLevel, 4))} ${text}\n\n`;
    }
    return `${text}\n\n`;
  });

  // 3. Clean remaining XML tags & entities
  return markdown
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract text and tables from DOCX buffer
 */
export function extractTextFromDocx(buffer: Buffer): string {
  // Verify PK header
  if (buffer.length > 4 && buffer.readUInt32LE(0) === 0x04034b50) {
    const docXmlBuf = extractFileFromZip(buffer, "word/document.xml");
    if (docXmlBuf) {
      const xmlStr = docXmlBuf.toString("utf-8");
      const md = docxXmlToMarkdown(xmlStr);
      if (md.trim().length > 0) return md;
    }
  }

  // Fallback: extract XML fragments or strings directly
  const rawStr = buffer.toString("utf-8");
  if (rawStr.includes("word/document.xml")) {
    const match = rawStr.match(/<w:document[\s\S]*?<\/w:document>/);
    if (match) return docxXmlToMarkdown(match[0]);
  }

  return extractReadableStrings(buffer);
}

/**
 * Extract text from legacy DOC (Word 97-2003 binary format, Word XML, or RTF)
 */
export function extractTextFromDoc(buffer: Buffer): string {
  // 1. If actually DOCX (starts with PK)
  if (buffer.length > 4 && buffer.readUInt32LE(0) === 0x04034b50) {
    return extractTextFromDocx(buffer);
  }

  // 2. Check if it's Word 2003 XML or HTML
  const str = buffer.toString("utf-8");
  if (str.startsWith("<?xml") || str.includes("<w:wordDocument") || str.includes("<html") || str.includes("<HTML")) {
    return str
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<tr[\s\S]*?<\/tr>/gi, (tr) => {
        const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [])
          .map((td) => td.replace(/<[^>]+>/g, "").trim().replace(/\|/g, "\\|"));
        return `| ${cells.join(" | ")} |\n`;
      })
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+\n/g, "\n\n")
      .trim();
  }

  // 3. Binary OLE2 DOC file extraction
  return extractReadableStrings(buffer);
}

/**
 * Native PDF stream text parser (0 external dependencies)
 */
export function extractTextFromPdfNative(pdfBuffer: Buffer): string {
  const textBlocks: string[] = [];
  const bufferLength = pdfBuffer.length;
  let offset = 0;

  while (offset < bufferLength) {
    const streamStart = pdfBuffer.indexOf(Buffer.from("stream"), offset);
    if (streamStart === -1) break;

    const dictStart = pdfBuffer.lastIndexOf(Buffer.from("<<"), streamStart);
    let isFlate = false;
    if (dictStart !== -1 && streamStart - dictStart < 2000) {
      const dictContent = pdfBuffer.toString("latin1", dictStart, streamStart);
      if (dictContent.includes("/FlateDecode")) {
        isFlate = true;
      }
    }

    let dataStart = streamStart + 6;
    if (dataStart < bufferLength && pdfBuffer[dataStart] === 0x0d) dataStart++;
    if (dataStart < bufferLength && pdfBuffer[dataStart] === 0x0a) dataStart++;

    const endStream = pdfBuffer.indexOf(Buffer.from("endstream"), dataStart);
    if (endStream === -1) {
      offset = streamStart + 6;
      continue;
    }

    const streamData = pdfBuffer.subarray(dataStart, endStream);
    let decodedText = "";

    if (isFlate) {
      try {
        decodedText = zlib.inflateSync(streamData).toString("latin1");
      } catch {
        try {
          decodedText = zlib.inflateRawSync(streamData).toString("latin1");
        } catch {
          // Skip corrupt stream
        }
      }
    } else {
      decodedText = streamData.toString("latin1");
    }

    if (decodedText) {
      const parsed = parsePdfStreamText(decodedText);
      if (parsed.trim()) {
        textBlocks.push(parsed.trim());
      }
    }

    offset = endStream + 9;
  }

  const full = textBlocks.join("\n\n");
  return full.trim();
}

function parsePdfStreamText(streamText: string): string {
  const lines: string[] = [];
  let currentLine = "";

  const btBlocks = streamText.match(/BT[\s\S]*?ET/g) || [streamText];

  for (const block of btBlocks) {
    const tokens = block.split(/(?=\b(?:T\*|Td|TD|Tj|TJ|'|")\b)/);
    for (const token of tokens) {
      if (/\b(?:T\*|Td|TD|'|")\b/.test(token)) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
          currentLine = "";
        }
      }

      const strMatch = token.match(/(\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]+>|\[[\s\S]*?\])\s*(?:Tj|TJ|'|")?/);
      if (strMatch) {
        const rawArg = strMatch[1];
        if (rawArg.startsWith("[")) {
          const parts = rawArg.match(/\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]+>/g) || [];
          for (const p of parts) {
            currentLine += decodePdfString(p);
          }
        } else {
          currentLine += decodePdfString(rawArg);
        }
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
      currentLine = "";
    }
  }

  return lines.join("\n");
}

function decodePdfString(str: string): string {
  if (str.startsWith("(") && str.endsWith(")")) {
    let unescaped = str.slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\b/g, "\b")
      .replace(/\\f/g, "\f")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");

    unescaped = unescaped.replace(/\\([0-7]{1,3})/g, (_, oct) =>
      String.fromCharCode(parseInt(oct, 8))
    );

    return unescaped;
  } else if (str.startsWith("<") && str.endsWith(">")) {
    const hex = str.slice(1, -1).replace(/\s+/g, "");
    let res = "";
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substring(i, i + 2), 16);
      if (!isNaN(code)) res += String.fromCharCode(code);
    }
    return res;
  }
  return "";
}

/**
 * Extract printable text strings (UTF-16LE and ASCII) from arbitrary binary buffers
 */
function extractReadableStrings(buffer: Buffer): string {
  const chunks: string[] = [];
  const len = buffer.length;

  // Scan for UTF-16LE strings (common in MS Office binary format)
  let utf16Chars: number[] = [];
  for (let i = 0; i < len - 1; i += 2) {
    const code = buffer.readUInt16LE(i);
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || (code >= 160 && code <= 500)) {
      utf16Chars.push(code);
    } else {
      if (utf16Chars.length >= 4) {
        chunks.push(String.fromCharCode(...utf16Chars));
      }
      utf16Chars = [];
    }
  }
  if (utf16Chars.length >= 4) {
    chunks.push(String.fromCharCode(...utf16Chars));
  }

  // Also scan for plain ASCII text runs
  let asciiChars: number[] = [];
  for (let i = 0; i < len; i++) {
    const byte = buffer[i];
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
      asciiChars.push(byte);
    } else {
      if (asciiChars.length >= 6) {
        chunks.push(Buffer.from(asciiChars).toString("latin1"));
      }
      asciiChars = [];
    }
  }
  if (asciiChars.length >= 6) {
    chunks.push(Buffer.from(asciiChars).toString("latin1"));
  }

  return chunks
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * AI-powered PDF extraction using Gemini Multimodal (when online & API key available)
 */
async function extractPdfWithGemini(pdfBuffer: Buffer, fileName: string): Promise<string | null> {
  const apiKey = loadGeminiApiKey();
  if (!apiKey || apiKey.length < 10) return null;

  const prompt = `You are a clinical neurology guideline parser.
Extract the entire text and clinical recommendations from this PDF document (${fileName}) into clean, formatted Markdown.
Preserve all recommendation tables, headings, and lists verbatim.
If recommendations or tables exist, format them with markdown columns:
| Domain / Topic | Recommendation Statement | Class (COR) / Level (LOE) | Trials / Evidence |
Do not add meta conversational text. Return only the extracted markdown.`;

  const models = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
  ];
  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: pdfBuffer.toString("base64"),
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
          },
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim().length > 30) {
        return text.trim();
      }
    } catch {
      // Fallback
    }
  }

  return null;
}

/**
 * Master Document Extractor: Supports .docx, .doc, .pdf, .md, .txt, .csv, .json
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  fileName: string
): Promise<{ text: string; format: string; method: string }> {
  const lowerName = fileName.toLowerCase();

  // 1. DOCX
  if (lowerName.endsWith(".docx")) {
    const text = extractTextFromDocx(buffer);
    return { text, format: "docx", method: "native-docx" };
  }

  // 2. DOC (legacy binary, XML, or RTF)
  if (lowerName.endsWith(".doc")) {
    const text = extractTextFromDoc(buffer);
    return { text, format: "doc", method: "native-doc" };
  }

  // 3. PDF
  if (lowerName.endsWith(".pdf") || (buffer.length > 4 && buffer.slice(0, 4).toString("latin1") === "%PDF")) {
    // Try Gemini AI extraction first if online
    try {
      const aiText = await extractPdfWithGemini(buffer, fileName);
      if (aiText && aiText.trim().length > 50) {
        return { text: aiText, format: "pdf", method: "gemini-ai" };
      }
    } catch {
      // Fallback
    }

    // Native PDF extraction
    const nativeText = extractTextFromPdfNative(buffer);
    if (nativeText && nativeText.trim().length > 20) {
      return { text: nativeText, format: "pdf", method: "native-pdf" };
    }

    // Ultimate fallback for scanned or protected PDF: readable strings
    return { text: extractReadableStrings(buffer), format: "pdf", method: "native-pdf-strings" };
  }

  // 4. Plain text formats (.md, .txt, .csv, .json, etc.)
  const utf8Text = buffer.toString("utf-8");
  return { text: utf8Text, format: "text", method: "utf-8" };
}
