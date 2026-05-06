import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { renderToString } from '@antv/infographic/ssr';
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
  remoteApiHost?: string;
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
      'font-size': 8,
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

async function convertSvgToPng(svgString: string, remoteApiHost: string): Promise<Buffer> {
  const url = `${remoteApiHost.replace(/\/$/, '')}/convert/svg-to-png`;

  const formData = new FormData();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
  formData.append('file', svgBlob, 'input.svg');

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const statusText = response.statusText || 'Unknown error';
    if (response.status === 400) {
      throw new Error(`Invalid input: ${statusText}`);
    } else if (response.status === 500) {
      throw new Error(`Conversion failed: ${statusText}`);
    }
    throw new Error(`Remote API error (${response.status}): ${statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

function validatePngRequirements(format: string, remoteApiHost: string | undefined): void {
  if (format === 'png' && !remoteApiHost) {
    error('Missing required option: --remote-api-host is required when output format is PNG.');
  }
}

function buildRenderConfig(
  configFile: string | undefined,
  theme: string | undefined,
): RenderConfig {
  const config = loadConfigSync(configFile);

  if (theme) {
    config.theme = theme;
  } else {
    config.themeConfig = themeConfig;
  }

  return config;
}

function loadConfigSync(configFile: string | undefined): RenderConfig {
  if (!configFile) return {};

  try {
    const configContent = readFileSync(configFile, 'utf-8');
    return JSON.parse(configContent) as RenderConfig;
  } catch {
    error(`Configuration file "${configFile}" is invalid or doesn't exist`);
  }
}

export async function renderCommand(options: RenderOptions): Promise<void> {
  const { input, output: userOutput, quiet, config: configFile, theme, remoteApiHost } = options;

  const log = quiet ? () => {} : info;

  validateOptions(options);
  await validateInputFile(input);

  const rawOutput = resolveOutput(userOutput, input);
  const format = resolveFormat(options, rawOutput);

  validatePngRequirements(format, remoteApiHost);

  const config = buildRenderConfig(configFile, theme);
  const output = resolveOutputFormat(rawOutput, format);
  const inputData = await prepareInputData(options);

  log('Rendering infographic...');

  try {
    const svgString = await renderToString(inputData, config);

    if (format === 'png') {
      const pngBuffer = await convertSvgToPng(svgString, remoteApiHost!);
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
