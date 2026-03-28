# screencli

AI-powered screen recording CLI. One command records an AI-driven browser demo with gradient backgrounds, auto-zoom, click highlights, and cursor trails — then uploads to a shareable link.

## Install

```bash
npx screencli record https://example.com -p "Click Sign Up, fill in the form, and submit"
```

No setup needed — login is triggered automatically on first run.

## Requirements

- Node.js 18+
- FFmpeg (`brew install ffmpeg` on macOS)

## Usage

```bash
# Record a demo
npx screencli record https://myapp.com -p "Navigate to pricing and compare plans"

# With a gradient background
npx screencli record https://myapp.com -p "Toggle dark mode" --background sunset

# Record a private app (login first, then AI takes over)
npx screencli record https://app.internal.com -p "Show the dashboard" --login --auth myapp

# Export for Twitter
npx screencli export ./recordings/abc123 --preset twitter
```

## Commands

| Command | Description |
|---------|-------------|
| `record [url] -p "..."` | Record an AI-driven browser demo |
| `export <dir> --preset <name>` | Export with platform presets (youtube, twitter, instagram, tiktok, linkedin, github-gif) |
| `login` | Sign in to screencli cloud |
| `logout` | Sign out |
| `whoami` | Show current user and plan |
| `recordings` | List your cloud recordings |
| `upload <dir>` | Upload a local recording |
| `delete <id>` | Delete a cloud recording |
| `render <id>` | Re-render with different settings |

## Links

- Website: https://screencli.sh
- AI Agent Skill: `npx skills add https://github.com/usefulagents/screencli --skill screencli`

## License

MIT
