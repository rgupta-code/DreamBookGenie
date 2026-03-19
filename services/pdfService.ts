
import { jsPDF } from "jspdf";
import { Story } from "../types";

export const generateStoryPDF = (story: Story) => {
  // Initialize PDF (Orientation: Landscape, Unit: mm, Format: A4)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // --- Title Page ---
  doc.setFillColor(240, 245, 255); // Light Indigo background
  doc.rect(0, 0, width, height, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(50, 50, 80);
  
  // Title Text (Centered)
  const titleLines = doc.splitTextToSize(story.title, width - 40);
  doc.text(titleLines, width / 2, height / 2 - 20, { align: "center" });

  doc.setFontSize(16);
  doc.setTextColor(100, 100, 150);
  doc.text("Created by DreamBookGenie", width / 2, height / 2 + 20, { align: "center" });
  if (story.createdAt) {
      doc.text(new Date(story.createdAt).toLocaleDateString(), width / 2, height / 2 + 30, { align: "center" });
  }

  // --- Story Pages ---
  story.pages.forEach((page, index) => {
    doc.addPage();
    
    // Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, width, height, 'F');

    // Layout: Image on Left (or Top), Text on Right (or Bottom)
    // Let's do split view: Image Left (50%), Text Right (50%)
    
    // Image
    if (page.imageUrl) {
      try {
        // Add image (x, y, w, h)
        // Keep aspect ratio roughly square-ish or fit to half page
        doc.addImage(page.imageUrl, 'JPEG', 10, 20, 130, 130);
      } catch (e) {
        console.error("Error adding image to PDF", e);
      }
    }

    // Page Number
    doc.setFontSize(12);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${page.page_number}`, width - 20, height - 10, { align: "right" });

    // Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 20);
    
    const textX = 150;
    const textY = 40;
    const maxTextWidth = width - 160;
    
    const textLines = doc.splitTextToSize(page.text, maxTextWidth);
    doc.text(textLines, textX, textY);
  });

  // Save
  doc.save(`${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
};

export const generateColoringBookPDF = (title: string, images: string[]) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Cover Page
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');
  
  // Decorative Border
  doc.setLineWidth(1);
  doc.setDrawColor(0, 0, 0);
  doc.rect(10, 10, width - 20, height - 20);
  doc.rect(12, 12, width - 24, height - 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(0, 0, 0);
  
  const titleLines = doc.splitTextToSize(title, width - 40);
  doc.text(titleLines, width / 2, height / 3, { align: "center" });

  doc.setFontSize(16);
  doc.text("A Coloring Book", width / 2, height / 2, { align: "center" });
  
  doc.setFontSize(12);
  doc.text("Created by DreamBookGenie", width / 2, height - 30, { align: "center" });

  // Image Pages
  images.forEach((img, index) => {
    doc.addPage();
    
    // Border
    doc.setLineWidth(0.5);
    doc.rect(10, 10, width - 20, height - 20);

    try {
        // Fit image within margins (20mm margin)
        // A4 is 210 x 297
        // Image area: 170 x 257 (approx)
        const imgSize = 170;
        doc.addImage(img, 'PNG', (width - imgSize) / 2, (height - imgSize) / 2, imgSize, imgSize);
    } catch (e) {
        console.error("Error adding coloring image to PDF", e);
    }
    
    // Page Number
    doc.setFontSize(10);
    doc.text(`${index + 1}`, width / 2, height - 15, { align: "center" });
  });

  doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
};
