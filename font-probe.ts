export class FontProbe {
    public static readonly availableFontMetrics = new Map<
        string,
        {
            xHeight: number;
            capHeight: number;
            emWidth: number;
            normalWidth: number;
        }
    >();

    // Baseline fonts should be commonly available, but measurably distinct, we need a pair to compare against to detect fallbacks
    private static readonly FONT_ONE_VARIANTS = [
        "Arial",
        "Verdana",
        "Times New Roman",
        "Palatino",
        "Helvetica",
    ];
    private static readonly FONT_TWO_VARIANTS = [
        "Courier New",
        "Courier",
        "Lucida Console",
        "Lucida Sans Typewriter",
    ];
    // If the task is to detect if the single character gets swapped to a fallback, change to that character
    private static readonly METRIC_SAMPLE = {
        xHeight: "xxxxxxxxxxxx",
        capHeight: "XXXXXXXXXXXX",
        emWidth: "mmmmmmmmmmmm",
        normalWidth: "nnnnnnnnnnnn",
    };
    private static readonly GENERIC_FONT_FAMILIES = new Set([
        "serif",
        "sans-serif",
        "monospace",
        "cursive",
        "fantasy",
        "system-ui",
        "emoji",
        "math",
        "fangsong",
        "ui-serif",
        "ui-sans-serif",
        "ui-monospace",
        "ui-rounded",
    ]);

    public static checkerFonts: [string, string] | null = null;

    /** Finding 2 distinct fonts that are not fallbacks and override each other if the order is swapped */
    public static defineCheckerFonts(): void {
        if (FontProbe.checkerFonts) {
            return;
        }
        const fontsOne = FontProbe.FONT_ONE_VARIANTS;
        const fontsTwo = FontProbe.FONT_TWO_VARIANTS;
        const measureCanvas = document.createElement("canvas");
        const context = measureCanvas.getContext("2d");
        if (!context) {
            return;
        }

        for (let i = 0; i < fontsOne.length; i++) {
            const fontName1 = fontsOne[i];
            for (let j = 0; j < fontsTwo.length; j++) {
                const fontName2 = fontsTwo[j];
                const signature1 = FontProbe.measureTypographySignature(
                    `"${fontName1}", "${fontName2}"`,
                );
                const signature2 = FontProbe.measureTypographySignature(
                    `"${fontName2}", "${fontName1}"`,
                );
                if (
                    signature1 &&
                    signature2 &&
                    !FontProbe.areSignaturesClose(signature1, signature2)
                ) {
                    FontProbe.checkerFonts = [fontName1, fontName2];
                    break;
                }
            }
            if (FontProbe.checkerFonts) {
                break;
            }
        }
    }

    // fontName should be from already cleaned candidate list
    public static getFontDistinctSignal(fontName: string): {
        label: string;
        className: string;
    } {
        if (!fontName) {
            return { label: "not found", className: "is-missing" };
        }

        if (FontProbe.availableFontMetrics.has(fontName)) {
            return { label: "available", className: "is-distinct" };
        }
        // Generic is not the name of the font
        if (FontProbe.GENERIC_FONT_FAMILIES.has(fontName.toLowerCase())) {
            return { label: "generic", className: "is-generic" };
        }

        // document.fonts?.check in case it works in some environments or will work in the future
        // Note, the other option FontFaceSet: check()
        // MDN: "is not designed to verify whether a specific font style can be rendered or if a particular font is fully loaded"
        // And Window.queryLocalFonts() is only for Chrome and Edge, and requires permission
        // It's more of a formality, never saw it return false on my devices
        if (document.fonts?.check) {
            if(!document.fonts.check(`16px "${fontName}"`)) {
                return { label: "not found", className: "is-missing" };
            }
        }

        if (FontProbe.runDualBaselineFontTest(fontName)) {
            return { label: "available", className: "is-distinct" };
        }

        return { label: "not rendering", className: "is-unknown" };
    }

    /** If in both cases returned signature is the same, and we know that checker fonts are different
     * then we know that the engine didn't fall back to the checker fonts and fontName is rendering.
     */
    public static runDualBaselineFontTest(fontName: string): boolean {

        if (!this.checkerFonts) {
            FontProbe.defineCheckerFonts();
            if (!this.checkerFonts) {
                return false;
            }
        }

        const [fontOne, fontTwo] = this.checkerFonts;
        const testOne = FontProbe.measureTypographySignature(`"${fontName}", "${fontOne}"`);
        const testTwo = FontProbe.measureTypographySignature(`"${fontName}", "${fontTwo}"`);
        if (FontProbe.areSignaturesClose(testOne, testTwo)) {
            FontProbe.availableFontMetrics.set(fontName, testOne!);
            return true;
        }
        return false;
    }

    public static measureTypographySignature(
        fontFamily: string,
    ): {
        xHeight: number;
        capHeight: number;
        emWidth: number;
        normalWidth: number;
    } | null {
        const measureCanvas = document.createElement("canvas");
        const context = measureCanvas.getContext("2d");
        if (!context) {
            return null;
        }
        const xMetrics = this.measureTextMetrics(
            context,
            fontFamily,
            FontProbe.METRIC_SAMPLE.xHeight,
        );
        const capMetrics = this.measureTextMetrics(
            context,
            fontFamily,
            FontProbe.METRIC_SAMPLE.capHeight,
        );
        const emMetrics = this.measureTextMetrics(
            context,
            fontFamily,
            FontProbe.METRIC_SAMPLE.emWidth,
        );
        const normalMetrics = this.measureTextMetrics(
            context,
            fontFamily,
            FontProbe.METRIC_SAMPLE.normalWidth,
        );

        if (!xMetrics || !capMetrics || !emMetrics || !normalMetrics) {
            return null;
        }

        const emCount = FontProbe.METRIC_SAMPLE.emWidth.length;
        const normalCount = FontProbe.METRIC_SAMPLE.normalWidth.length;

        return {
            xHeight: xMetrics.height,
            capHeight: capMetrics.height,
            emWidth: emMetrics.width / emCount,
            normalWidth: normalMetrics.width / normalCount,
        };
    }

    public static measureTextMetrics(
        context: CanvasRenderingContext2D,
        fontFamily: string,
        sample: string,
    ): { width: number; height: number } | null {
        context.font = `32px ${fontFamily}`;
        const metrics = context.measureText(sample);

        const ascent = Number.isFinite(metrics.actualBoundingBoxAscent)
            ? metrics.actualBoundingBoxAscent
            : 0;
        const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
            ? metrics.actualBoundingBoxDescent
            : 0;
        const height = Math.max(1, ascent + descent);

        if (!Number.isFinite(metrics.width) || metrics.width <= 0) {
            return null;
        }

        return {
            width: metrics.width,
            height,
        };
    }

    private static areSignaturesClose(
        first: {
            xHeight: number;
            capHeight: number;
            emWidth: number;
            normalWidth: number;
        } | null,
        second: {
            xHeight: number;
            capHeight: number;
            emWidth: number;
            normalWidth: number;
        } | null,
    ): boolean {
        if (!first || !second) {
            return false;
        }
        const maxHeightBase = Math.max(1, second.capHeight);
        const maxWidthBase = Math.max(1, second.emWidth);

        const xHeightDelta =
            Math.abs(first.xHeight - second.xHeight) / maxHeightBase;
        const capHeightDelta =
            Math.abs(first.capHeight - second.capHeight) / maxHeightBase;
        const emWidthDelta =
            Math.abs(first.emWidth - second.emWidth) / maxWidthBase;
        const normalWidthDelta =
            Math.abs(first.normalWidth - second.normalWidth) / maxWidthBase;

        const aggregateDelta =
            (xHeightDelta + capHeightDelta + emWidthDelta + normalWidthDelta) / 4;
        return aggregateDelta <= 0.02;
    }

    public static splitFontFamilyList(fontStack: string): string[] {
        if (!fontStack.trim()) {
            return [];
        }
        return fontStack.replace(/['"]/g, "").replace(/\s+/g, " ")
            .split(",")
            .map((candidate) => candidate.trim())
            .filter((candidate) => candidate);
    }

    public static candidatesToCss(candidates: string[]): string {
        return candidates
            .map((name) => {
                if (FontProbe.GENERIC_FONT_FAMILIES.has(name.toLowerCase())) {
                    return name.toLowerCase();
                }
                return `"${name}"`;
            })
            .join(", ");
    }
}
