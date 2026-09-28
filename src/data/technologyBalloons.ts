import reactSketch from '../../public/textures/about/reactduzybalon.webp?url';
import reactPainted from '../../public/textures/about/reactduzybalon_painted.webp?url';
import javascriptSketch from '../../public/textures/about/JSSREDNIBALON.webp?url';
import javascriptPainted from '../../public/textures/about/JSSREDNIBALON_painted.webp?url';
import gitSketch from '../../public/textures/about/gitmalybalon.webp?url';
import gitPainted from '../../public/textures/about/gitmalybalon_painted.webp?url';
import figmaSketch from '../../public/textures/about/figmamalybalon.webp?url';
import figmaPainted from '../../public/textures/about/figmamalybalon_painted.webp?url';
import htmlSketch from '../../public/textures/about/htmlmalybalon.webp?url';
import htmlPainted from '../../public/textures/about/htmlmalybalon_painted.webp?url';
import cssSketch from '../../public/textures/about/csssrednibalon.webp?url';
import cssPainted from '../../public/textures/about/csssrednibalon_painted.webp?url';

export const TECHNOLOGY_BALLOONS = {
  react: { label: 'React', sketch: reactSketch, painted: reactPainted, aspect: 2 / 3 },
  javascript: { label: 'JavaScript', sketch: javascriptSketch, painted: javascriptPainted, aspect: 2 / 3 },
  git: { label: 'Git', sketch: gitSketch, painted: gitPainted, aspect: 2 / 3 },
  figma: { label: 'Figma', sketch: figmaSketch, painted: figmaPainted, aspect: 2 / 3 },
  html: { label: 'HTML', sketch: htmlSketch, painted: htmlPainted, aspect: 2 / 3 },
  css: { label: 'CSS', sketch: cssSketch, painted: cssPainted, aspect: 848 / 1264 },
};
export type TechnologyKey = keyof typeof TECHNOLOGY_BALLOONS;
