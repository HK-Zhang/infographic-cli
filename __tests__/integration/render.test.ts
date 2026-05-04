import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { execSync, spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI = 'node dist/cli.js';
const outputDir = join(tmpdir(), 'infographic-cli-tests');

describe('CLI', () => {
  beforeEach(() => {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  });

  // afterEach(() => {
  //   // Clean up test output files
  //   try {
  //     const files = ['test.svg', 'simple.svg', 'input.svg'];
  //     files.forEach(file => {
  //       const filePath = join(outputDir, file);
  //       if (existsSync(filePath)) {
  //         unlinkSync(filePath);
  //       }
  //     });
  //     const infoFiles = ['test.ifgc', 'simple.ifgc', 'input.ifgc'];
  //     infoFiles.forEach(file => {
  //       const filePath = join(outputDir, file);
  //       if (existsSync(filePath)) {
  //         unlinkSync(filePath);
  //       }
  //     });
  //   } catch {
  //     // Ignore cleanup errors
  //   }
  // });

  it('should render a simple infographic to PNG by default', () => {
    const inputFile = join(outputDir, 'input.ifgc');
    const outputFile = join(outputDir, 'output.png');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title Test Infographic
  desc This is a test
  items
    - label Step 1
      desc First step
    - label Step 2
      desc Second step
    - label Step 3
      desc Third step
`;
    writeFileSync(inputFile, input);

    execSync(CLI + ` -i ${inputFile} -o ${outputFile}`);

    expect(existsSync(outputFile)).toBe(true);

    // PNG files start with PNG signature
    const pngBuffer = readFileSync(outputFile);
    expect(pngBuffer[0]).toBe(0x89);
    expect(pngBuffer[1]).toBe(0x50);
    expect(pngBuffer[2]).toBe(0x4E);
    expect(pngBuffer[3]).toBe(0x47);
  });

  it('should render a simple infographic to SVG with --format svg', () => {
    const inputFile = join(outputDir, 'input-svg.ifgc');
    const outputFile = join(outputDir, 'output-svg.svg');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title Test Infographic
  desc This is a test
  items
    - label Step 1
      desc First step
    - label Step 2
      desc Second step
    - label Step 3
      desc Third step
`;
    writeFileSync(inputFile, input);

    execSync(CLI + ` -i ${inputFile} -o ${outputFile} --format svg`);

    expect(existsSync(outputFile)).toBe(true);

    const svgContent = readFileSync(outputFile, 'utf-8');
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('Test Infographic');
    expect(svgContent).toContain('Step 1');
  });

  it('should render using template shorthand', () => {
    const inputFile = join(outputDir, 'simple.ifgc');
    const outputFile = join(outputDir, 'simple.png');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title Simple Test
  items
    - label A
    - label B
    - label C
`;
    writeFileSync(inputFile, input);

    execSync(CLI + ` -i ${inputFile} -o ${outputFile}`);

    expect(existsSync(outputFile)).toBe(true);
    const pngBuffer = readFileSync(outputFile);
    expect(pngBuffer[0]).toBe(0x89);
  });

  it('should infer output format from file extension', () => {
    const inputFile = join(outputDir, 'test.ifgc');
    const outputFile = join(outputDir, 'test.png');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title Test
  items
    - label A
`;
    writeFileSync(inputFile, input);

    execSync(CLI + ` -i ${inputFile} -o ${outputFile}`);

    expect(existsSync(outputFile)).toBe(true);
    const pngBuffer = readFileSync(outputFile);
    expect(pngBuffer[0]).toBe(0x89);
  });

  it('should infer SVG format from .svg extension', () => {
    const inputFile = join(outputDir, 'test-svg.ifgc');
    const outputFile = join(outputDir, 'test-explicit.svg');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title Test
  items
    - label A
`;
    writeFileSync(inputFile, input);

    execSync(CLI + ` -i ${inputFile} -o ${outputFile}`);

    expect(existsSync(outputFile)).toBe(true);
    const svgContent = readFileSync(outputFile, 'utf-8');
    expect(svgContent).toContain('<svg');
  });

  it('should read from stdin using echo pipe', async () => {
    const outputFile = join(outputDir, 'stdin-test.png');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title From Stdin
  items
    - label A
`;

    await new Promise<void>((resolve, reject) => {
      const child = spawn('node', ['dist/cli.js', '-o', outputFile], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        } else {
          resolve();
        }
      });

      child.stdin.write(input);
      child.stdin.end();
    });

    expect(existsSync(outputFile)).toBe(true);
    const pngBuffer = readFileSync(outputFile);
    expect(pngBuffer[0]).toBe(0x89);
  });

  it('should suppress output with --quiet flag', () => {
    const inputFile = join(outputDir, 'quiet-test.ifgc');
    const outputFile = join(outputDir, 'quiet-test.png');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title Quiet Test
  items
    - label A
`;
    writeFileSync(inputFile, input);

    const output = execSync(
      CLI + ` -i ${inputFile} -o ${outputFile} --quiet`,
      { encoding: 'utf-8' }
    );

    // Should not contain "Rendering" message
    expect(output).not.toContain('Rendering');
    // But file should still be created
    expect(existsSync(outputFile)).toBe(true);
  });

  it('should error for non-existent input file', () => {
    const outputFile = join(outputDir, 'test.png');
    expect(() => {
      execSync(CLI + ` -i /nonexistent/file.ifgc -o ${outputFile}`, {
        encoding: 'utf-8',
      });
    }).toThrow();
  });

  it('should create output directory if it does not exist', () => {
    const inputFile = join(outputDir, 'test.ifgc');
    const outputFile = join(outputDir, 'subdir', 'nested', 'test.png');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title Directory Test
  items
    - label A
`;
    writeFileSync(inputFile, input);

    execSync(CLI + ` -i ${inputFile} -o ${outputFile}`);

    expect(existsSync(outputFile)).toBe(true);
    const pngBuffer = readFileSync(outputFile);
    expect(pngBuffer[0]).toBe(0x89);
  });
});

describe('CLI with configuration', () => {
  let outputDir: string;

  beforeEach(() => {
    outputDir = join(tmpdir(), 'infographic-cli-config-tests');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  });

  // afterEach(() => {
  //   try {
  //     const files = ['theme-test.svg', 'config-test.svg', 'config.json', 'theme-test.ifgc', 'config-test.ifgc'];
  //     files.forEach(file => {
  //       const filePath = join(outputDir, file);
  //       if (existsSync(filePath)) {
  //         unlinkSync(filePath);
  //       }
  //     });
  //   } catch {
  //     // Ignore cleanup errors
  //   }
  // });

  it('should use custom theme when specified', () => {
    const inputFile = join(outputDir, 'theme-test.ifgc');
    const outputFile = join(outputDir, 'theme-test.png');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title Theme Test
  items
    - label A
`;
    writeFileSync(inputFile, input);

    execSync(CLI + ` -i ${inputFile} -o ${outputFile} --theme hand-drawn`);

    expect(existsSync(outputFile)).toBe(true);
    const pngBuffer = readFileSync(outputFile);
    expect(pngBuffer[0]).toBe(0x89);
  });

  it('should load configuration from file', () => {
    const inputFile = join(outputDir, 'config-test.ifgc');
    const configFile = join(outputDir, 'config.json');
    const outputFile = join(outputDir, 'config-test.png');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title Config Test
  items
    - label A
`;
    const config = { theme: 'hand-drawn' };

    writeFileSync(inputFile, input);
    writeFileSync(configFile, JSON.stringify(config));

    execSync(
      CLI + ` -i ${inputFile} -o ${outputFile} --config ${configFile}`
    );

    expect(existsSync(outputFile)).toBe(true);
    const pngBuffer = readFileSync(outputFile);
    expect(pngBuffer[0]).toBe(0x89);
  });

  it('should render SVG with config file', () => {
    const inputFile = join(outputDir, 'config-svg-test.ifgc');
    const configFile = join(outputDir, 'config-svg.json');
    const outputFile = join(outputDir, 'config-svg-test.svg');
    const input = `infographic list-row-simple-horizontal-arrow
data
  title Config SVG Test
  items
    - label A
`;
    const config = { theme: 'hand-drawn' };

    writeFileSync(inputFile, input);
    writeFileSync(configFile, JSON.stringify(config));

    execSync(
      CLI + ` -i ${inputFile} -o ${outputFile} --config ${configFile} --format svg`
    );

    expect(existsSync(outputFile)).toBe(true);
    const svgContent = readFileSync(outputFile, 'utf-8');
    expect(svgContent).toContain('<svg');
  });
});
