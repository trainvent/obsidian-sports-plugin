import svg from '../../assets/sports-icon.svg';

export const SPORTS_ICON_ID = 'sports-lelogo';
// Obsidian supplies the outer SVG; this body uses its 100 × 100 custom-icon coordinates.
export const SPORTS_ICON_SVG = svg.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
