const PDFLib = require('pdf-lib');
const fs = require('fs');

async function createTestPDF() {
  const pdfDoc = await PDFLib.PDFDocument.create();
  
  // ページを追加
  const page = pdfDoc.addPage([600, 800]);
  
  // フォントを追加
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  
  // テスト問題を書き込み（英語版）
  const testQuestion = `
Question 1: What is the most important initial evaluation for cardiac arrest patients?

a) Pupillary response check
b) Pulse palpation
c) Respiratory assessment  
d) Blood pressure measurement
e) Temperature measurement

Answer: c

Question 2: What is the appropriate depth for chest compressions in adult CPR?

a) More than 3cm
b) More than 4cm
c) More than 5cm
d) More than 6cm
e) More than 7cm

Answer: c
`;

  page.drawText(testQuestion, {
    x: 50,
    y: 700,
    size: 12,
    font: font,
  });
  
  // PDFを保存
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('test-questions.pdf', pdfBytes);
  
  console.log('Test PDF created: test-questions.pdf');
}

createTestPDF().catch(console.error);
