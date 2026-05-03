#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import axios from "axios";

const program = new Command();
const SEPARATOR = chalk.bold.cyan("━".repeat(55));

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  avatar_url: string;
  blog: string | null;
  twitter_username: string | null;
}

interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  html_url: string;
  fork: boolean;
}

interface GitHubEvent {
  type: string;
  created_at: string;
  repo: { name: string };
}

async function fetchUser(username: string): Promise<GitHubUser> {
  const { data } = await axios.get(`https://api.github.com/users/${username}`);
  return data;
}

async function fetchRepos(username: string): Promise<GitHubRepo[]> {
  const { data } = await axios.get(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=stars`
  );
  return data;
}

async function fetchEvents(username: string): Promise<GitHubEvent[]> {
  const { data } = await axios.get(
    `https://api.github.com/users/${username}/events/public?per_page=30`
  );
  return data;
}

function calculateScore(repos: GitHubRepo[]): number {
  return repos.reduce((acc, repo) => {
    return acc + repo.stargazers_count * 2 + repo.forks_count;
  }, 0);
}

function getTotalStars(repos: GitHubRepo[]): number {
  return repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
}

function getLanguages(repos: GitHubRepo[]): Record<string, number> {
  const languages: Record<string, number> = {};
  repos
    .filter((repo) => !repo.fork)
    .forEach((repo) => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    });
  return languages;
}

function getActivitySummary(events: GitHubEvent[]): Record<string, number> {
  const summary: Record<string, number> = {};
  events.forEach((event) => {
    const type = event.type.replace("Event", "");
    summary[type] = (summary[type] || 0) + 1;
  });
  return summary;
}

function getAccountAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const years = now.getFullYear() - created.getFullYear();
  const months = now.getMonth() - created.getMonth();
  if (years === 0) return `${months} months`;
  if (months < 0) return `${years - 1} years`;
  return `${years} years`;
}

function printProfile(
  user: GitHubUser,
  repos: GitHubRepo[],
  events: GitHubEvent[]
): void {
  const totalStars = getTotalStars(repos);
  const score = calculateScore(repos);
  const languages = getLanguages(repos);
  const activity = getActivitySummary(events);
  const ownRepos = repos.filter((r) => !r.fork).length;
  const forkedRepos = repos.filter((r) => r.fork).length;

  console.log("\n" + SEPARATOR);
  console.log(chalk.bold.white(`  ${user.name || user.login}`) + chalk.gray(`  @${user.login}`));
  if (user.bio) console.log(chalk.gray(`  ${user.bio}`));
  console.log(SEPARATOR);

  // Info
  console.log(chalk.bold.white("\n  PROFILE\n"));
  if (user.location) console.log(chalk.gray("  Location        ") + chalk.white(user.location));
  if (user.blog) console.log(chalk.gray("  Website         ") + chalk.cyan(user.blog));
  if (user.twitter_username) console.log(chalk.gray("  Twitter         ") + chalk.cyan(`@${user.twitter_username}`));
  console.log(chalk.gray("  Account age     ") + chalk.white(getAccountAge(user.created_at)));
  console.log(chalk.gray("  Followers       ") + chalk.white(user.followers));
  console.log(chalk.gray("  Following       ") + chalk.white(user.following));

  const ratio =
    user.following === 0
      ? "inf"
      : (user.followers / user.following).toFixed(2);
  console.log(chalk.gray("  Follow ratio    ") + chalk.white(ratio));

  // Repos
  console.log(chalk.bold.white("\n  REPOSITORIES\n"));
  console.log(chalk.gray("  Total repos     ") + chalk.white(user.public_repos));
  console.log(chalk.gray("  Own repos       ") + chalk.white(ownRepos));
  console.log(chalk.gray("  Forked repos    ") + chalk.white(forkedRepos));
  console.log(chalk.gray("  Total stars     ") + chalk.yellow(totalStars));
  console.log(chalk.gray("  Popularity score") + chalk.magenta(score));

  // Top repos
  const topRepos = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5);

  console.log(chalk.bold.white("\n  TOP REPOSITORIES\n"));
  topRepos.forEach((repo, i) => {
    const lang = repo.language ? chalk.green(` [${repo.language}]`) : "";
    const stars = chalk.yellow(`${repo.stargazers_count} stars`);
    const forks = chalk.blue(`${repo.forks_count} forks`);
    const issues = chalk.red(`${repo.open_issues_count} issues`);
    console.log(`  ${chalk.bold.white(`${i + 1}. ${repo.name}`)}${lang}`);
    console.log(`     ${stars}  ${forks}  ${issues}`);
    if (repo.description) {
      console.log(`     ${chalk.gray(repo.description)}`);
    }
    console.log();
  });

  // Languages
  const sortedLangs = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (sortedLangs.length > 0) {
    console.log(chalk.bold.white("  LANGUAGES\n"));
    const max = sortedLangs[0][1];
    sortedLangs.forEach(([lang, count]) => {
      const barLength = Math.round((count / max) * 20);
      const bar = chalk.cyan("█".repeat(barLength)) + chalk.gray("░".repeat(20 - barLength));
      console.log(`  ${chalk.white(lang.padEnd(16))} ${bar}  ${chalk.gray(count + " repos")}`);
    });
    console.log();
  }

  // Activity
  if (Object.keys(activity).length > 0) {
    console.log(chalk.bold.white("  RECENT ACTIVITY\n"));
    Object.entries(activity)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const bar = chalk.magenta("▪".repeat(Math.min(count, 20)));
        console.log(`  ${chalk.white(type.padEnd(16))} ${bar}  ${chalk.gray(count)}`);
      });
    console.log();
  }

  console.log(SEPARATOR);
  console.log(chalk.gray(`  github.com/${user.login}`));
  console.log(SEPARATOR + "\n");
}

function printComparison(
  userA: GitHubUser,
  reposA: GitHubRepo[],
  userB: GitHubUser,
  reposB: GitHubRepo[]
): void {
  const scoreA = calculateScore(reposA);
  const scoreB = calculateScore(reposB);
  const starsA = getTotalStars(reposA);
  const starsB = getTotalStars(reposB);

  const win = chalk.bold.green("WIN");
  const lose = chalk.gray("---");

  const nameA = chalk.cyan(`@${userA.login}`.padEnd(20));
  const nameB = chalk.cyan(`@${userB.login}`);

  console.log("\n" + SEPARATOR);
  console.log(chalk.bold.white("  COMPARISON"));
  console.log(SEPARATOR);
  console.log(`\n  ${chalk.gray("Metric".padEnd(20))} ${nameA} ${nameB}\n`);

  const row = (
    label: string,
    a: number | string,
    b: number | string,
    higherIsBetter = true
  ) => {
    const numA = Number(a);
    const numB = Number(b);
    const aWins = higherIsBetter ? numA >= numB : numA <= numB;
    const bWins = higherIsBetter ? numB >= numA : numB <= numA;
    console.log(
      `  ${chalk.gray(label.padEnd(20))} ${chalk.white(String(a).padEnd(20))} ${chalk.white(String(b))}  ${aWins && numA !== numB ? win : bWins && numA !== numB ? "   " + lose : ""}`
    );
  };

  row("Followers", userA.followers, userB.followers);
  row("Public repos", userA.public_repos, userB.public_repos);
  row("Total stars", starsA, starsB);
  row("Popularity score", scoreA, scoreB);
  row("Follow ratio",
    userA.following === 0 ? 999 : userA.followers / userA.following,
    userB.following === 0 ? 999 : userB.followers / userB.following
  );

  console.log();
  const winner = scoreA > scoreB ? userA.login : userB.login;
  console.log(chalk.bold.white(`  Overall winner: `) + chalk.bold.green(winner));
  console.log("\n" + SEPARATOR + "\n");
}

// Commands

program
  .name("gitpulse")
  .description("GitHub stats in your terminal")
  .version("1.0.0");

program
  .command("stats <username>")
  .description("Show stats for a GitHub user")
  .option("--json", "Output as JSON")
  .action(async (username: string, options: { json: boolean }) => {
    const spinner = ora(`Fetching ${username}...`).start();
    try {
      const [user, repos, events] = await Promise.all([
        fetchUser(username),
        fetchRepos(username),
        fetchEvents(username),
      ]);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify({ user, repos, events }, null, 2));
        return;
      }

      printProfile(user, repos, events);
    } catch (error: any) {
      spinner.stop();
      if (error.response?.status === 404) {
        console.log(chalk.red(`\n  User "${username}" not found.\n`));
      } else {
        console.log(chalk.red(`\n  Error: ${error.message}\n`));
      }
    }
  });

program
  .command("compare <userA> <userB>")
  .description("Compare two GitHub users")
  .action(async (userA: string, userB: string) => {
    const spinner = ora(`Comparing ${userA} vs ${userB}...`).start();
    try {
      const [user1, repos1, user2, repos2] = await Promise.all([
        fetchUser(userA),
        fetchRepos(userA),
        fetchUser(userB),
        fetchRepos(userB),
      ]);
      spinner.stop();
      printComparison(user1, repos1, user2, repos2);
    } catch (error: any) {
      spinner.stop();
      console.log(chalk.red(`\n  Error: ${error.message}\n`));
    }
  });

program.parse();