const inquirer = require('inquirer');
const spawn = require('cross-spawn');
const {platform} = require('os');
const osType = platform();
let runner = 'Nethermind.Runner';

switch (osType) {
  case 'linux':
    runner = `./${runner}`;
    break;
  case 'darwin':
    runner = `./${runner}`;
    break;
  case 'win32':
    runner = `${runner}.exe`;
    break;
}

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

inquirer.prompt(options).then(o => {
  const config = `${o.config}${o.sync}`;
  startProcess(runner, ['--config', config]);
});

function startProcess(name, args) {
  const process = spawn(name, args, {stdio: 'inherit'});
  process.on('error', () => {
    console.error(`There was an error when starting ${name}`);
  });
}
