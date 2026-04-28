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
    do { try handler.perform([request]) } catch { }
    return extractedText
}

func extractRemainingText(pdfPath: String) {
    let url = URL(fileURLWithPath: pdfPath)
    guard let doc = PDFDocument(url: url) else { return }
    var fullText = ""
    for i in 6..<doc.pageCount { 
        guard let page = doc.page(at: i) else { continue }
        let pageRect = page.bounds(for: .mediaBox)
        let renderer = NSImage(size: pageRect.size)
        renderer.lockFocus()
        if let context = NSGraphicsContext.current?.cgContext {
            context.setFillColor(NSColor.white.cgColor)
            context.fill(pageRect)
            page.draw(with: .mediaBox, to: context)
        }
        renderer.unlockFocus()
        if let tiffData = renderer.tiffRepresentation,
           let bitmapImage = NSBitmapImageRep(data: tiffData),
           let cgImage = bitmapImage.cgImage {
            fullText += "\n\n--- PAGE \(i+1) ---\n" + recognizeText(in: cgImage) + "\n"
        }
    }
    try? fullText.write(to: URL(fileURLWithPath: "scratch/real_math_ocr_remaining.txt"), atomically: true, encoding: .utf8)
}

let args = CommandLine.arguments
if args.count > 1 { extractRemainingText(pdfPath: args[1]) }
