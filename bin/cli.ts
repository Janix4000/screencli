#!/usr/bin/env node

import { Command } from 'commander';
import { recordCommand } from '../src/cli/commands/record.js';
import { exportCommand } from '../src/cli/commands/export.js';
import { initCommand } from '../src/cli/commands/init.js';

const program = new Command()
  .name('screencli')
  .description('AI-powered screen recording CLI tool')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(recordCommand);
program.addCommand(exportCommand);

program.parse();
