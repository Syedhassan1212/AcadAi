import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export class ExportService {
  /**
   * Sanitize computed styles that html2canvas can't parse (like oklch, lab).
   * Walks every element and forces colors to rgb.
   */
  private static sanitizeColors(root: HTMLElement) {
    const els = root.querySelectorAll('*');
    els.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const computed = getComputedStyle(htmlEl);
      
      // List of CSS color properties that html2canvas tries to parse
      const colorProps = ['color', 'background-color', 'border-color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color'];
      
      colorProps.forEach(prop => {
        const val = computed.getPropertyValue(prop);
        if (val && (val.includes('oklch') || val.includes('lab') || val.includes('lch') || val.includes('oklab'))) {
          // Force to a safe fallback
          if (prop === 'color') {
            htmlEl.style.color = '#333333';
          } else if (prop === 'background-color') {
            htmlEl.style.backgroundColor = 'transparent';
          } else {
            htmlEl.style.setProperty(prop, '#dddddd');
          }
        }
      });
    });
  }

  static async exportToPDF(
    elementId: string,
    filename: string = 'study-note.pdf'
  ): Promise<boolean> {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Export element not found');
      return false;
    }

    try {
      // 1. Clone element and apply print styles
      const clonedElement = element.cloneNode(true) as HTMLElement;
      clonedElement.classList.add('export-print-mode');
      clonedElement.style.width = '800px';
      clonedElement.style.padding = '48px';
      clonedElement.style.backgroundColor = '#ffffff';
      clonedElement.style.color = '#333333';
      clonedElement.style.fontFamily = "'Inter', 'Segoe UI', Arial, sans-serif";
      clonedElement.style.lineHeight = '1.7';
      clonedElement.style.fontSize = '14px';

      // 2. Append off-screen for capture
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);

      // 3. Sanitize modern CSS colors that html2canvas can't parse
      this.sanitizeColors(clonedElement);

      // 4. Capture as canvas
      const canvas = await html2canvas(clonedElement, {
        scale: 1,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        windowWidth: 800,
      });

      // 5. Clean up temp DOM
      document.body.removeChild(tempContainer);

      // 6. Create A4 PDF with pagination
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      // Additional pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      return true;
    } catch (err) {
      console.error('PDF Export failed:', err);
      return false;
    }
  }
}