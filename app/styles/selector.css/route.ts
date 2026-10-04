import { cssResponse, STYLE_FILES } from '../../lib/styleSheets';

// CSS izbora stana (vidi app/lib/styleSheets.ts). Pravi se pri build-u.
export const dynamic = 'force-static';

export function GET() {
  return cssResponse(STYLE_FILES.selector.css);
}
