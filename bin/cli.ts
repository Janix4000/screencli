#!/usr/bin/env node

import { Command } from 'commander';
import { recordCommand } from '../src/cli/commands/record.js';
import { exportCommand } from '../src/cli/commands/export.js';
import { initCommand } from '../src/cli/commands/init.js';
import { loginCommand } from '../src/cli/commands/login.js';
import { logoutCommand } from '../src/cli/commands/logout.js';
import { whoamiCommand } from '../src/cli/commands/whoami.js';
import { recordingsCommand } from '../src/cli/commands/recordings.js';
import { deleteCommand } from '../src/cli/commands/delete.js';
import { uploadCommand } from '../src/cli/commands/upload.js';
import { renderCommand } from '../src/cli/commands/render.js';

const program = new Command()
  .name('screencli')
  .description('AI-powered screen recording CLI tool')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(recordCommand);
program.addCommand(exportCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);
program.addCommand(recordingsCommand);
program.addCommand(deleteCommand);
program.addCommand(uploadCommand);
program.addCommand(renderCommand);

program.parse();
