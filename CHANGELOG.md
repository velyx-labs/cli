# velyx

## 2.0.2

### Patch Changes

- Ask user to override existing velyx.css theme file

  When running `velyx init`, if a velyx.css file already exists, the CLI will now ask the user if they want to overwrite it with the current theme or
  keep the existing file.

  Also fixed EEXIST error when overwriting existing files.

## 2.0.1

### Patch Changes

- 69e4a23: Add Tailwind CSS v4 @theme inline support to theme generation

## 2.0.0

### Major Changes

- Initial release of velyx CLI
