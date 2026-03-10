# Velyx CLI

Velyx CLI is a command-line tool for adding UI components to Laravel projects.

It delivers composable UI components built with **Blade**, **Alpine.js**, and **Tailwind CSS v4**.
Inspired by shadcn, Velyx gives you the code, not a dependency.

---

## What Velyx is

- A **code delivery tool** for Laravel UI components
- A way to **copy components into your project**
- A workflow that keeps **you in control of your code**

## What Velyx is not

- Not a UI framework
- Not a runtime dependency
- Not an auto-updating system
- Not magic

Once components are added, they belong to your project.

---

## Requirements

Velyx assumes a modern Laravel setup:

- Laravel
- Blade
- Alpine.js
- Tailwind CSS **v4 or higher**

Tailwind v3 is not supported.

---

## Usage

Velyx can be executed without installation.

### Initialize Velyx in a project

```bash
npx velyx@latest init
```

This command:

- checks your environment
- prepares the UI components directory

---

### Add a component

```bash
npx velyx@latest add button
```

Velyx will:

- fetch the component from the registry
- resolve its dependencies
- copy the files into your project

By default, components are placed in:

```bash
resources/views/components/ui
```

---

### List available components

```bash
npx velyx@latest list
```

### Search for a component

```bash
npx velyx@latest search
```

---

## Installation

Velyx can be used without installation via `npx`, but you can also install it globally for frequent use:

```bash
npm install -g velyx@latest
# or
pnpm add -g velyx@latest
```

For development releases (beta/next tags):

```bash
npx velyx@latest
```

---

## How updates work

Velyx does **not** update your code automatically.

If a component changes in the registry and you want the new version:

- run `npx velyx@latest add <component>` again
- review the changes
- decide what to keep

This is intentional.

---

## Philosophy

Velyx follows a simple principle:

> You own your UI code.

There are no hidden abstractions and no vendor lock-in.
Velyx exists to help you move faster, not to take control away from you.

---

## Configuration

After running `npx velyx@latest init`, a `velyx.json` file is created in your project root. This file stores your Velyx configuration and can be customized to your needs.

## Documentation

Full documentation is available at [velyx.dev](https://velyx.dev):

- Introduction
- Getting started
- Component reference
- Project philosophy

Technical documentation for testing architecture:

- [docs/TESTING.md](docs/TESTING.md)

## Links

- **Registry**: [registry.velyx.dev](https://registry.velyx.dev)
- **Documentation**: [velyx.dev](https://velyx.dev)
- **GitHub**: [github.com/velyx-labs/cli](https://github.com/velyx-labs/cli)

---

## License

MIT
