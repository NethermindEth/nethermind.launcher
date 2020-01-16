const inquirer = require('inquirer');
const spawn = require('cross-spawn');
const {platform} = require('os');
const osType = platform();
const fs = require('fs')


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
    choices: ['Ethereum Node', 'CLI'],
    filter: function(value) {
      return value.toLowerCase();
    }
  }
];

const options = [{
    type: 'list',
    name: 'config',
    message: 'Select network',
    choices: ['Goerli', 'Mainnet', 'Rinkeby', 'Ropsten', 'xDai', 'Poacore'],
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

const ethStatsEnabled = [{
    type: 'confirm',
    name: 'Enabled',
    message: 'Do you want to configure ethstats registration now?',
    default: false
  },
]

const ethStatsOptions = [
  //{
  //  type: 'input',
  //  name: 'Server',
  //  message: 'What is the ethStats WebSocket address (this is a WebSocket address that you can obtain from Core Devs, depends on chain selected)?',
  //  default: 'wss://ethstats.net/api'
  //},
  {
    type: 'input',
    name: 'Name',
    message: 'What should be the node name displyed on ethstats?',
    default: 'Nethermind Node'
  },
  {
    type: 'input',
    name: 'Contact',
    message: 'What should be the contact address for the node operator?',
    default: 'dev@nethermind.io'
  },
  {
    type: 'input',
    name: 'Secret',
    message: 'What is the ethstats password (this is a secret that you can obtain from Core Devs)?',
    validate: function (input) {
      if (input === '') {
        console.log('Secret password needs to be provided.')
      } else {
        return true
      }
    }
  },
];

inquirer.prompt(mainOptions).then(o => {
  if (o.mainConfig === 'cli') {
    startProcess(applications.cli, []);
    return;
  }
  inquirer.prompt(options).then(o => {
      const config = `${o.config}${o.sync}`;
      fs.readFile(`configs/${config}.cfg`, 'utf8', (err, jsonString) => {
        if (err) {
            console.log("Couldn't load config file:", err)
            return
        }
        jsonObject = JSON.parse(jsonString)
        console.log('EthStats:', jsonObject.EthStats)
        if (jsonObject.EthStats.Enabled == false) {
          inquirer.prompt(ethStatsEnabled).then(o => {
            if (o.Enabled === false) {
              console.log("EthStats configuration process will be skipped.");
              startProcess(applications.runner, ['--config', config]);
            } else {
              inquirer.prompt(ethStatsOptions).then(o => {
                jsonObject.EthStats.Enabled = true
                jsonObject.EthStats.Name = o.Name
                jsonObject.EthStats.Secret = o.Secret
                jsonObject.EthStats.Contact = o.Contact
                fs.writeFileSync(`configs/${config}.cfg`, JSON.stringify(jsonObject, null, 4), "utf-8");
                startProcess(applications.runner, ['--config', config]);
              });
            }
          })
        }
      })
  });
});

function startProcess(name, args) {
  const process = spawn(name, args, {stdio: 'inherit'});
  process.on('error', () => {
    console.error(`There was an error when starting ${name}`);
  });
}
