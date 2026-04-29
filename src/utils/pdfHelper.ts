import html2pdf from 'html2pdf.js';

interface PDFOptions {
    filename: string;
    margin?: number;
}

export const downloadElementAsPDF = async (element: HTMLElement, options: PDFOptions) => {
    const opt = {
        margin: options.margin || 0.5,
        filename: options.filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: true,
            letterRendering: true,
            windowWidth: 800,
            scrollY: 0,
            scrollX: 0
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        await html2pdf().set(opt).from(element).save();
        return true;
    } catch (err) {
        console.error('PDF Generation Error:', err);
        return false;
    }
};

export const getElementAsPDFBlob = async (element: HTMLElement, filename: string): Promise<Blob | null> => {
    const opt = {
        margin: 0.5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
            windowWidth: 800
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
        const worker = html2pdf().set(opt).from(element);
        const blob = await worker.output('blob');
        return blob;
    } catch (err) {
        console.error('PDF Blob Error:', err);
        return null;
    }
};
