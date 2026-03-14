import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export function createSpinner(text: string): Ora {
  return ora({ text, color: 'cyan' });
}

export function header(text: string): void {
  console.log(chalk.bold.cyan(`\n  ${text}\n`));
}

export function success(text: string): void {
  console.log(chalk.green(`  ✓ ${text}`));
}

export function info(text: string): void {
  console.log(chalk.blue(`  ℹ ${text}`));
}

export function warn(text: string): void {
  console.log(chalk.yellow(`  ⚠ ${text}`));
}

export function error(text: string): void {
  console.error(chalk.red(`  ✗ ${text}`));
}

export function actionLog(step: number, toolName: string, description: string): void {
  const stepStr = chalk.gray(`[${String(step).padStart(2, '0')}]`);
  const tool = chalk.cyan(toolName.padEnd(15));
  console.log(`  ${stepStr} ${tool} ${description}`);
}

export function stats(label: string, value: string | number): void {
  console.log(`  ${chalk.gray(label.padEnd(20))} ${value}`);
}
