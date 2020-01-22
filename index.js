const inquirer = require('inquirer');
const spawn = require('cross-spawn');
const { platform } = require('os');
const osType = platform();
const fs = require('fs');

const applications = {
  runner: 'Nethermind.Runner',
  cli: 'Nethermind.Cli',
}

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
  filter: function (value) {
    return value.toLowerCase();
  }
}
];

const configs = fs.readdirSync('configs');

const networks = configs.filter((config) => {
  return !config.includes('ndm') && !config.includes('archive') && !config.includes('test') && 
    !config.includes('spaceneth') && !config.includes('hive') && !config.includes('Test')
}).map((cfg) => {
  c = cfg.replace('.cfg', '')
  return c.charAt(0).toUpperCase() + c.slice(1)
})

const options = [{
  type: 'list',
  pageSize: 10,
  name: 'config',
  message: 'Select network',
  choices: networks,
  filter: function (value) {
    return value.toLowerCase();
  }
},
{
  type: 'list',
  name: 'sync',
  message: 'Select sync',
  choices: ['Fast sync', 'Full archive'],
  filter: function (value) {
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

const jsonRpcEnabled = [{
  type: 'confirm',
  name: 'Enabled',
  message: 'Would you like to enable web3 / JSON RPC capabilities? (this will expose your node to attacks unless you configured a firewall)',
  default: false
},
]


const ethStatsOptions = [
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
        return 'Secret password needs to be provided.'
      } else {
        return true
      }
    }
  },
];

const args = process.argv.slice(3)

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
      if (jsonObject.JsonRpc.Enabled == false) {
        console.log('JsonRpc:', jsonObject.JsonRpc)
        inquirer.prompt(jsonRpcEnabled).then(j => {
          if (j.Enabled != false) {
            jsonObject.JsonRpc.Enabled = true
            fs.writeFileSync(`configs/${config}.cfg`, JSON.stringify(jsonObject, null, 4), "utf-8");
            ethStats(jsonObject, config);
          } else {
            console.log("JsonRpc configuration will be skipped.");
            ethStats(jsonObject, config)
          }
        });
      } else if (jsonObject.JsonRpc.Enabled == true && jsonObject.EthStats.Enabled == true) {
        startProcess(applications.runner, ['--config', config, ...args]);
      }
      else {
        ethStats(jsonObject, config)
      }
    })
  });
});

function ethStats(jsonObject, config) {
  if (jsonObject.EthStats.Enabled == false) {
    console.log('EthStats:', jsonObject.EthStats)
    inquirer.prompt(ethStatsEnabled).then(o => {
      if (o.Enabled === false) {
        console.log("EthStats configuration process will be skipped.");
        startProcess(applications.runner, ['--config', config,  ...args]);
      } else {
        inquirer.prompt(ethStatsOptions).then(o => {
          jsonObject.EthStats.Enabled = true
          jsonObject.EthStats.Name = o.Name
          jsonObject.EthStats.Secret = o.Secret
          jsonObject.EthStats.Contact = o.Contact
          inquirer.prompt({
            type: 'input',
            name: 'Server',
            message: 'What is the ethStats WebSocket address (this is a WebSocket address that you can obtain from Core Devs, depends on chain selected)?',
            default: function (value) {
              if (config == "goerli" || config == "goerli_archive") {
                return value = "wss://stats.goerli.net/api"
              } else if (config == "mainnet" || config == "mainnet_archive") {
                return value = "wss://ethstats.net/api"
              } else if (config == "ropsten" || config == "ropsten_archive") {
                return value = "ws://ropsten-stats.parity.io/api"
              }
            }
          }).then(o => {
            if (jsonObject.EthStats.Server != o.Server && o.Server != "") {
              jsonObject.EthStats.Server = o.Server
            }
            fs.writeFileSync(`configs/${config}.cfg`, JSON.stringify(jsonObject, null, 4), "utf-8")
            startProcess(applications.runner, ['--config', config, ...args])
          })
        });
      }
    })
  } else {
    startProcess(applications.runner, ['--config', config, ...args])
  }
}

function startProcess(name, args) {
  const process = spawn(name, args, { stdio: 'inherit' });
  process.on('error', () => {
    console.error(`There was an error when starting ${name}`);
  });
}

module.exports = {
  applications,

}