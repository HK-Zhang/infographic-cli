import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';

// Get the correct directory path
const __filename = fileURLToPath(import.meta.url);
const testsDir = dirname(dirname(__filename));

const CLI = 'node dist/cli.js';
const outputDir = join(tmpdir(), 'infographic-cli-examples');
const examplesDir = join(testsDir, 'fixtures', 'examples');

// List of example files to test
const exampleFiles = [
  '01-basic-list.txt',
  '02-list-with-icons.txt',
  '03-timeline.txt',
  '04-themed-dark.txt',
  '05-quarterly-revenue.txt',
  '06-comparison.txt',
  '07-hierarchy.txt',
  '08-quadrant.txt',
  '09-chart-bars.txt',
  '10-swot-analysis.txt',
  '11-list-with-icons-hand-drawn.txt',
];

describe('SSR Examples Tests', () => {
  beforeEach(() => {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  });

  // afterEach(() => {
  //   // Clean up generated SVG files
  //   try {
  //     const files = readdirSync(outputDir);
  //     files.forEach(file => {
  //       if (file.endsWith('.svg')) {
  //         unlinkSync(join(outputDir, file));
  //       }
  //     });
  //   } catch {
  //     // Ignore cleanup errors
  //   }
  // });

  for (const file of exampleFiles) {
    it(`should render ${file} to SVG`, () => {
      const inputFile = join(examplesDir, file);
      const svgFileName = file.replace('.txt', '.svg');
      const outputFile = join(outputDir, svgFileName);

      // Read input to verify it exists
      const input = readFileSync(inputFile, 'utf-8');
      expect(input.length).toBeGreaterThan(0);

      // Render the infographic as SVG
      execSync(CLI + ` -i ${inputFile} -o ${outputFile} --format svg`);

      // Verify output file was created
      expect(existsSync(outputFile)).toBe(true);

      // Read the generated SVG
      const svgContent = readFileSync(outputFile, 'utf-8');

      // Verify it's valid SVG
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('</svg>');
      expect(svgContent.length).toBeGreaterThan(1000);
    });

    it(`should render ${file} to PNG`, () => {
      const inputFile = join(examplesDir, file);
      const pngFileName = file.replace('.txt', '.png');
      const outputFile = join(outputDir, pngFileName);

      // Read input to verify it exists
      const input = readFileSync(inputFile, 'utf-8');
      expect(input.length).toBeGreaterThan(0);

      // Render the infographic as PNG (default format)
      execSync(CLI + ` -i ${inputFile} -o ${outputFile}`);

      // Verify output file was created
      expect(existsSync(outputFile)).toBe(true);

      // Verify it's valid PNG
      const pngBuffer = readFileSync(outputFile);
      expect(pngBuffer[0]).toBe(0x89);
      expect(pngBuffer[1]).toBe(0x50);
      expect(pngBuffer[2]).toBe(0x4E);
      expect(pngBuffer[3]).toBe(0x47);
    });
  }
});

describe('Visual Output Preview', () => {
  beforeEach(() => {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  });

  it('should show a sample SVG rendered output', () => {
    const inputFile = join(examplesDir, '01-basic-list.txt');
    const outputFile = join(outputDir, '01-basic-list.svg');

    execSync(CLI + ` -i ${inputFile} -o ${outputFile} --format svg`);

    const content = readFileSync(outputFile, 'utf-8');

    console.log('\n' + '='.repeat(60));
    console.log('📊 Sample Infographic Output (01-basic-list.svg)');
    console.log('='.repeat(60));
    console.log('\nThis is what the CLI generates:\n');

    // Show preview
    console.log(content.split('\n').slice(0, 25).join('\n'));
    console.log('...');

    console.log(`\nFile size: ${content.length} bytes`);
    console.log('View the file to see the complete SVG infographic\n');

    console.log('='.repeat(60));

    // Verify it's valid SVG
    expect(content).toContain('<svg');
    expect(content).toContain('</svg>');
  });

  it('should show a sample PNG rendered output', () => {
    const inputFile = join(examplesDir, '01-basic-list.txt');
    const outputFile = join(outputDir, '01-basic-list.png');

    execSync(CLI + ` -i ${inputFile} -o ${outputFile}`);

    const pngBuffer = readFileSync(outputFile);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Sample Infographic Output (01-basic-list.png)');
    console.log('='.repeat(60));
    console.log('\nPNG file generated successfully!\n');

    console.log(`File size: ${pngBuffer.length} bytes`);
    console.log('View the file to see the complete PNG infographic\n');

    console.log('='.repeat(60));

    // Verify it's valid PNG
    expect(pngBuffer[0]).toBe(0x89);
    expect(pngBuffer[1]).toBe(0x50);
    expect(pngBuffer[2]).toBe(0x4E);
    expect(pngBuffer[3]).toBe(0x47);
  });

  it('should list all example files', () => {
    console.log('\n📁 Example files:');
    exampleFiles.forEach((file, index) => {
      const inputFile = join(examplesDir, file);
      const input = readFileSync(inputFile, 'utf-8');
      const lines = input.split('\n').filter(l => l.trim());
      console.log(`  ${index + 1}. ${file} (${lines.length} lines)`);
    });
    console.log('');
  });
});
