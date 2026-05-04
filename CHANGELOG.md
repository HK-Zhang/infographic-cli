# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2026-05-04

### Changed

- Replaced local Playwright-based SVG-to-PNG conversion with a remote API call to reduce dependency weight.
- Added `--remote-api-host` option (required when output format is PNG) to specify the remote conversion service.

### Removed

- Removed `playwright` dependency.

## [0.0.1] - 2026-05-03

### Added

- Initial release of `infog-cli` — a command-line tool for generating SVG infographics from declarative syntax.
- CLI commands: `render` and `serve` for rendering infographics to SVG or starting a local preview server.
- Support for rendering from strings, files, or stdin.
- Theme configuration support for customizing infographic appearance.
- Integration with `@antv/infographic` for infographic generation.
- Dual CLI aliases: `ifgc` and `infographic`.
- Prebuild npm audit check for security validation.
- Comprehensive test suite using Vitest.

### Changed

- Refactored CLI command syntax for improved usability.
- Updated project name references in README and LICENSE to `infog-cli`.

### Fixed

- Improved file imports and project metadata.

[0.0.1]: https://github.com/HK-Zhang/infographic-cli/releases/tag/v0.0.1
