import html2pdf from 'html2pdf.js';

interface PDFOptions {
    filename: string;
    margin?: number;
}

// html2pdf slices the captured canvas into pages of this height (letter 11in usable height @ 96dpi).
// The jsPDF margin is 0; page whitespace comes from the container's own p-12 padding instead.
const PAGE_INNER_HEIGHT_PX = 1056
// p-12 padding on .pdf-export-container (48px top + 48px bottom).
const PDF_CONTAINER_PAD = 48
// The recipe hero image keeps rounded corners via its wrapper (.pdf-hero, overflow-hidden).
const HERO_MIN = 360
const HERO_MAX = 520

// html2canvas has no flexbox support, so "image fills leftover page space" must be
// resolved with real layout before capture: measure section 1 with the image collapsed,
// then give the hero the exact remaining height (clamped) so page 1 fills for short
// recipes while long recipes keep the min height and pagination stays unchanged.
const fitHeroToPage = (element: HTMLElement): (() => void) => {
    const hero = element.querySelector<HTMLElement>('.pdf-hero')
    const section = element.querySelector<HTMLElement>('.pdf-section-first')
    if (!hero || !section) return () => {}
    const prev = hero.style.height
    hero.style.height = '0px'
    const restHeight = section.getBoundingClientRect().height
    hero.style.height = prev
    const target = PAGE_INNER_HEIGHT_PX - PDF_CONTAINER_PAD * 2
    const height = Math.min(HERO_MAX, Math.max(HERO_MIN, target - restHeight))
    hero.style.height = `${height}px`
    return () => { hero.style.height = prev }
}

export const downloadElementAsPDF = async (element: HTMLElement, options: PDFOptions) => {
    const windowWidth = element.offsetWidth || 816
    if (windowWidth !== 816) {
        console.warn(`[PDF] export element rendered ${windowWidth}px wide (expected 816px) — windowWidth follows measured width to avoid clipping`)
    }
    const opt = {
        margin: options.margin || 0,
        filename: options.filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: true,
            letterRendering: true,
            windowWidth,
            scrollY: 0,
            scrollX: 0
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        const restoreHero = fitHeroToPage(element)
        try {
            await html2pdf().set(opt).from(element).save();
            return true;
        } finally {
            restoreHero();
        }
    } catch (err) {
        console.error('PDF Generation Error:', err);
        return false;
    }
};

export const getElementAsPDFBlob = async (element: HTMLElement, filename: string): Promise<Blob | null> => {
    const windowWidth = element.offsetWidth || 816
    if (windowWidth !== 816) {
        console.warn(`[PDF] export element rendered ${windowWidth}px wide (expected 816px) — windowWidth follows measured width to avoid clipping`)
    }
    const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
            windowWidth,
            scrollY: 0,
            scrollX: 0
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        const restoreHero = fitHeroToPage(element)
        try {
            const worker = html2pdf().set(opt).from(element);
            const blob = await worker.output('blob');
            return blob;
        } finally {
            restoreHero();
        }
    } catch (err) {
        console.error('PDF Blob Error:', err);
        return null;
    }
};
