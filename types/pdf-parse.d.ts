declare module 'pdf-parse' {
  interface PDFData {
    text: string
    numpages: number
    numrender: number
    info: any
    metadata: any
    version: string
  }

  interface PDFOptions {
    max?: number
    normalizeWhitespace?: boolean
    disableCombineTextItems?: boolean
    useWorker?: boolean
  }

  function pdfParse(buffer: Buffer, options?: PDFOptions): Promise<PDFData>
  export = pdfParse
}
