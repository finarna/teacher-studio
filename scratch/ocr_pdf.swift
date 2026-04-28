import Foundation
import Quartz
import Vision
import AppKit

func recognizeText(in image: CGImage) -> String {
    var extractedText = ""
    let request = VNRecognizeTextRequest { (request, error) in
        guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
        for observation in observations {
            guard let topCandidate = observation.topCandidates(1).first else { continue }
            extractedText += topCandidate.string + "\n"
        }
    }
    request.recognitionLevel = .accurate
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    do {
        try handler.perform([request])
    } catch {
        print("Error performing OCR: \(error)")
    }
    return extractedText
}

func extractTextFromPage(pdfPath: String, pageIndex: Int) {
    let url = URL(fileURLWithPath: pdfPath)
    guard let document = PDFDocument(url: url) else { return }
    
    guard let page = document.page(at: pageIndex) else { return }
    
    let pageRect = page.bounds(for: .mediaBox)
    let renderer = NSImage(size: pageRect.size)
    renderer.lockFocus()
    guard let context = NSGraphicsContext.current?.cgContext else { return }
    context.setFillColor(NSColor.white.cgColor)
    context.fill(pageRect)
    page.draw(with: .mediaBox, to: context)
    renderer.unlockFocus()
    
    guard let tiffData = renderer.tiffRepresentation,
          let bitmapImage = NSBitmapImageRep(data: tiffData),
          let cgImage = bitmapImage.cgImage else { return }
    
    let text = recognizeText(in: cgImage)
    print("--- OCR RESULTS PAGE \(pageIndex + 1) ---\n")
    print(text)
}

let args = CommandLine.arguments
if args.count > 1 {
    let path = args[1]
    let startIdx = 1 // Skip first page (instructions)
    let url = URL(fileURLWithPath: path)
    if let doc = PDFDocument(url: url) {
        for i in startIdx..<min(4, doc.pageCount) {
             extractTextFromPage(pdfPath: path, pageIndex: i)
        }
    }
}
