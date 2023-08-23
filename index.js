const inquirer = require('inquirer');
const spawn = require('cross-spawn');
const { platform } = require('os');
const osType = platform();
const fs = require('fs');
const fetch = require("node-fetch");
const path = require('path');
const commander = require('commander');

// const program = new commander.Command();

const applications = {
  runner: 'nethermind',
  cli: 'nethermind-cli'
}

// program
//   .option('-i, --install', 'Install dependencies required by Nethermind client')
//   .option('-u, --update', 'Update Nethermind client to the latest release')
//   .description('Nethermind Launcher for Ethereum Client')

// program.parse(process.argv);

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
    applications.runner = `./${applications.runner}.exe`;
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
}];

const options = [{
  type: 'list',
  pageSize: 10,
  name: 'config',
  message: 'Select network',
  choices: ['Ethereum (mainnet)', 'Goerli (light Clique testnet)', 'Ropsten (PoS testnet)', 'Sepolia (PoW testnet)', 'Rinkeby (heavy Clique testnet)', 'Gnosis (xDai)', 'POA Core (POA mainnet)', 'Spaceneth (local developer node)'],
  filter: function (value) {
    return value.toLowerCase();
  }
}];

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

const jsonRpcUrl = [{
  type: 'input',
  name: 'Host',
  message: 'What should be the JSON RPC Host IP? (this should be the same as your host machine IP address)',
  default: '127.0.0.1',
}]

const ethStatsOptions = [
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
  {
    type: 'input',
    name: 'Name',
    message: 'What should be the node name displayed on ethstats?',
    default: 'Nethermind Node'
  },
  {
    type: 'input',
    name: 'Contact',
    message: 'What should be the contact address for the node operator?',
    default: 'dev@nethermind.io'
  }
];

const args = process.argv.slice(2)

let project_folder;
if(process.pkg){
    project_folder = path.dirname(process.execPath)
    
} else{
    project_folder = __dirname
}

inquirer.prompt(mainOptions).then(o => {
  if (o.mainConfig === 'cli') {
    startProcess(applications.cli, []);
    return;
  }
  inquirer.prompt(options).then(o => {

    choicesDefault = ['Fast sync', 'Archive']
    choicesSpaceneth = ['in-memory (state is lost after restart)', 'persistent (state is stored in the DB)']

    inquirer.prompt({
      type: 'list',
      name: 'sync',
      message: 'Select sync',
      choices: function () {
        if (o.config === 'spaceneth (local developer node)') {
          return choicesSpaceneth
        } else {
          return choicesDefault
        }
      },
      filter: function (value) {
        if (value === 'Fast sync') {
          return ''
        } else if ( value === 'Archive') {
          return '_archive'
        } else if ( value === 'in-memory (state is lost after restart)') {
          return ''
        } else if ( value === 'persistent (state is stored in the DB)') {
          return '_persistent'
        }
      }
    }).then(s => {
      if (o.config === 'ethereum (mainnet)') {
        config = `mainnet${s.sync}`
      } else if (o.config === 'poa core (poa mainnet)') {
        config = `poacore${s.sync}`
      } else if (o.config === 'gnosis (xdai)') {
        config = `gnosis${s.sync}`
      } else {
        config = `${o.config.split(" ")[0]}${s.sync}`
      }
      fs.readFile(path.join(project_folder, `configs/${config}.cfg`), 'utf8', (err, jsonString) => {
        if (err) {
          console.log(`Couldn't load config ${config} file: `, err)
          return
        }
        jsonObject = JSON.parse(jsonString)
        if (jsonObject?.JsonRpc?.Enabled === false) {
          console.log('JsonRpc:', jsonObject.JsonRpc)
          inquirer.prompt(jsonRpcEnabled).then(j => {
            if (j.Enabled != false) {
              jsonObject.JsonRpc.Enabled = true
              inquirer.prompt(jsonRpcUrl).then(k => {
                jsonObject.JsonRpc.Host = k.Host
                ethStats(jsonObject, config);
                fs.writeFile(path.join(project_folder, `configs/${config}.cfg`), JSON.stringify(jsonObject, null, 4), "utf-8", (err) => {
                  if (err) {
                    console.log(`Couldn't write the config ${config} file: `, err)
                    return
                  }
                });
              });
            } else {
              console.log("JsonRpc configuration will be skipped.");
              ethStats(jsonObject, config)
            }
          });
        } else if (jsonObject.JsonRpc in jsonObject && jsonObject.JsonRpc.Enabled == true && jsonObject.EthStats in jsonObject && jsonObject.EthStats.Enabled == true) {
          startProcess(applications.runner, ['--config', config, ...args]);
        }
        else {
          ethStats(jsonObject, config)
        }
      })
    });
  });
});

function ethStats(jsonObject, config) {
  if (jsonObject?.EthStats?.Enabled == false) {
    console.log('EthStats:', jsonObject.EthStats)
    inquirer.prompt(ethStatsEnabled).then(o => {
      if (o.Enabled === false) {
        console.log("EthStats configuration process will be skipped.");
        startProcess(applications.runner, ['--config', config, ...args]);
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
            if (jsonObject?.EthStats?.Server != o.Server && o.Server != "") {
              jsonObject.EthStats.Server = o.Server
            }
            fs.writeFile(path.join(project_folder,`configs/${config}.cfg`), JSON.stringify(jsonObject, null, 4), "utf-8", () =>
              startProcess(applications.runner, ['--config', config, ...args])
            )  
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
  process.on('error', (err) => {
    console.error(`There was an error when starting ${name}` + err);
  });
  process.on('SIGINT', () => {
    console.log('Received SIGINT');
    let clds = process.children();
    clds.forEach((pid) => {
      process.kill(pid);
    });
  });
}

module.exports = {
  applications,
  options,
  jsonRpcEnabled,
  jsonRpcUrl,
  ethStatsEnabled,
  ethStatsOptions,
  mainOptions,
  startProcess
}
