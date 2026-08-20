import fs from 'node:fs';
import path from 'node:path';


describe('LayerExplorer interaction styles', () => {
  it('defines 44px-or-larger targets, visible focus and reduced-motion fallback', () => {
    const stylesheet = fs.readFileSync(
      path.join(
        process.cwd(),
        'components/weather/LayerExplorer/LayerExplorer.module.css',
      ),
      'utf8',
    );

    expect(stylesheet).toMatch(/\.openExplorer,[\s\S]*min-height: 44px;/);
    expect(stylesheet).toMatch(/\.quickButton[\s\S]*min-height: 56px;/);
    expect(stylesheet).toMatch(/\.layerOption,[\s\S]*min-height: 48px;/);
    expect(stylesheet).toMatch(/\.controlInput:focus-visible \+ \.optionCard/);
    expect(stylesheet).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(stylesheet).toMatch(/transition: none;/);
  });
});
