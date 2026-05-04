import fs from 'node:fs/promises';
import { renderToString } from '@antv/infographic/ssr';
import { chromium } from 'playwright';
import { error, info, success } from '../utils/error.js';
import { getInputData } from '../utils/input.js';
import { getDefaultOutput, writeOutput } from '../utils/output.js';

export interface RenderOptions {
  input?: string;
  string?: string;
  output?: string;
  format?: string;
  background?: string;
  quiet?: boolean;
  config?: string;
  theme?: string;
}

const themeConfig = {
  colorPrimary: '#13204c',
  colorBg: '#FFFFFF',
  palette: [
    '#a1d9f1',
    '#36a0dc',
    '#4d9b2e',
    '#b22d1d',
    '#13204c',
    '#facf6c',
    '#FFC06C',
    '#e1f000',
    '#9fffb2',
  ],
  base:{
    text:{
      "font-family": 'Arial',
    }
  },
  item: {
    label: {
      // 'font-size': 10,
      'line-height': 1
    },
    desc: {
      // 'font-size': 8,
      'line-height': 1
    }
  }
};

type RenderConfig = NonNullable<Parameters<typeof renderToString>[1]>;

function validateOptions(options: RenderOptions): void {
  if (options.input && options.string) {
    error('Cannot use both --input and --string options. Please use one.');
  }
}

async function validateInputFile(input: string | undefined): Promise<void> {
  if (!input || input === '-') return;

  try {
    await fs.access(input);
  } catch {
    error(`Input file "${input}" doesn't exist`);
  }
}

async function loadConfig(configFile: string | undefined): Promise<RenderConfig> {
  if (!configFile) return {};

  try {
    const configContent = await fs.readFile(configFile, 'utf-8');
    return JSON.parse(configContent) as RenderConfig;
  } catch {
    error(`Configuration file "${configFile}" is invalid or doesn't exist`);
  }
}

function resolveOutput(userOutput: string | undefined, input: string | undefined): string {
  if (userOutput === '-') return '/dev/stdout';
  if (userOutput) return userOutput;

  const actualInput = input && input !== '-' ? input : undefined;
  return getDefaultOutput(actualInput);
}

function resolveFormat(options: RenderOptions, output: string): string {
  // If explicitly specified, use it
  if (options.format) {
    const format = options.format.toLowerCase();
    if (format !== 'png' && format !== 'svg') {
      error(`Unsupported format "${format}". Use "png" or "svg".`);
    }
    return format;
  }

  // Infer from output file extension
  if (output && output !== '-') {
    if (output.toLowerCase().endsWith('.svg')) return 'svg';
    if (output.toLowerCase().endsWith('.png')) return 'png';
  }

  // Default to png
  return 'png';
}

function resolveOutputFormat(output: string, format: string): string {
  if (output === '/dev/stdout') return output;

  // If output already has the correct extension, use it
  const ext = `.${format.toLowerCase()}`;
  if (output.toLowerCase().endsWith(ext)) return output;

  // If output has a different image extension, replace it
  if (/\.(svg|png)$/i.test(output)) {
    return output.replace(/\.(svg|png)$/i, ext);
  }

  // Otherwise append the format extension
  return `${output}${ext}`;
}

async function convertSvgToPng(svgString: string): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0">${svgString}</body></html>`;
    await page.setContent(html, { waitUntil: 'networkidle' });

    const svgElement = page.locator('svg');
    await svgElement.waitFor();

    const screenshot = await svgElement.screenshot({
      type: 'png',
      omitBackground: false,
    });

    return screenshot;
  } finally {
    await browser.close();
  }
}

async function prepareInputData(options: RenderOptions): Promise<string> {
  let inputData: string;

  if (options.string) {
    inputData = options.string.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  } else {
    const file = options.input && options.input !== '-' ? options.input : undefined;
    inputData = await getInputData(file);
  }

  if (!inputData.trim()) {
    error('No input data provided');
  }

  return inputData;
}

export async function renderCommand(options: RenderOptions): Promise<void> {
  const { input, output: userOutput, quiet, config: configFile, theme } = options;

  const log = quiet ? () => {} : info;

  validateOptions(options);
  await validateInputFile(input);

  const config = await loadConfig(configFile);

  if (theme) {
    config.theme = theme;
  }else{
    config.themeConfig = themeConfig;
  }

  const rawOutput = resolveOutput(userOutput, input);
  const format = resolveFormat(options, rawOutput);
  const output = resolveOutputFormat(rawOutput, format);
  const inputData = await prepareInputData(options);

  log('Rendering infographic...');

  try {
    const svgString = await renderToString(inputData, config);

    if (format === 'png') {
      const pngBuffer = await convertSvgToPng(svgString);
      await writeOutput(output, pngBuffer);
    } else {
      await writeOutput(output, svgString);
    }

    if (output !== '/dev/stdout') {
      success(`Infographic rendered to ${output}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(`Failed to render: ${message}`);
  }
}
