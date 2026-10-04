import { cssResponse, STYLE_FILES } from '../../lib/styleSheets';

// Zajednički CSS sajta (vidi app/lib/styleSheets.ts). Pravi se pri build-u.
export const dynamic = 'force-static';

export function GET() {
  return cssResponse(STYLE_FILES.site.css);
}
