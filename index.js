const inquirer = require('inquirer');
const spawn = require('cross-spawn');
const {platform} = require('os');
const osType = platform();

const applications = {
  runner: 'Nethermind.Runner',
  cli: 'Nethermind.Cli',
}

let runner = 'Nethermind.Runner';

switch (osType) {
  case 'linux':
    applications.runner = `./${applications.runner}`;
    applications.cli = `./${applications.cli}`;
    break;
  case 'darwin':
    applications.runner = `./${applications.runner}`;
    applications.cli = `./${applications.cli}`;
    break;
  case 'win32':
    applications.runner = `${applications.runner}.exe`;
    applications.cli = `./${applications.cli}.exe`;
    break;
}

const mainOptions = [{
    type: 'list',
    name: 'mainConfig',
    message: 'Start Nethermind',
    choices: ['Node', 'CLI'],
    filter: function(value) {
      return value.toLowerCase();
    }
  }
];

const options = [{
    type: 'list',
    name: 'config',
    message: 'Select network',
    choices: ['Goerli', 'Mainnet', 'Rinkeby', 'Ropsten'],
    filter: function(value) {
      return value.toLowerCase();
    }
  },
  {
    type: 'list',
    name: 'sync',
    message: 'Select sync',
    choices: ['Fast sync', 'Full archive'],
    filter: function(value) {
      return value === 'Fast sync' ? '' : '_archive';
    }
  }
];

inquirer.prompt(mainOptions).then(o => {
  if (o.mainConfig === 'cli') {
    startProcess(applications.cli, []);
    return;
  }
  inquirer.prompt(options).then(o => {
      const config = `${o.config}${o.sync}`;
      startProcess(applications.runner, ['--config', config]);
  });
});

function startProcess(name, args) {
  const process = spawn(name, args, {stdio: 'inherit'});
  process.on('error', () => {
    console.error(`There was an error when starting ${name}`);
  });
}
