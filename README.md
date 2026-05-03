# gitpulse

A fast, minimal CLI to inspect any GitHub profile directly from your terminal.

No browser needed. Just a username.

## Demo

```
gitpulse stats torvalds
gitpulse compare N4xv torvalds
```

## Features

- Full profile overview: followers, repos, account age, follow ratio
- Total stars across all repositories
- Popularity score calculated from stars and forks
- Top 5 repositories with stars, forks and open issues
- Language breakdown with visual bar chart
- Recent activity summary
- Side-by-side comparison between two users
- JSON output flag for scripting and integrations

## Install

```bash
npm install -g gitpulse
```

## Usage

### Show stats for a user

```bash
gitpulse stats <username>
```

### Compare two users

```bash
gitpulse compare <userA> <userB>
```

### Output as JSON

```bash
gitpulse stats <username> --json
```

## Examples

```bash
gitpulse stats N4xv
gitpulse stats torvalds
gitpulse compare N4xv gaearon
gitpulse stats N4xv --json > output.json
```

## Built with

- TypeScript
- Commander
- Chalk
- Ora
- Axios

## License

MIT