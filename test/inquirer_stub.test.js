const inquirer = require('inquirer')
const inquirer_stub = require('./inquirer_stub')
const assert = require('chai').assert;
const expect = require('chai').expect;
const index = require('../index')
const mock = require('mock-fs')
const fs = require('fs');

const userInputs = {
  node: 'ethereum node',
  network: 'ethereum (mainnet)',
  mode: '',
  jsonRpcUrl: '127.0.0.1',
  nodeName: 'Nethermind Node',
  contact: 'dev@nethermind.io',
  secret: '',
  config: 'mainnet',
  wss: 'wss://ethstats.net/api'
}

describe('Applications', function() {
  it('applications should not be empty', function() {
      expect(index.applications).not.to.be.empty;
  });

  it('applications should include Runner and Cli', function() {
      expect(index.applications).to.include({ runner: './Nethermind.Runner', cli: './Nethermind.Cli' });
  });
});

describe('Check if configs/ directory contains config file', () => {
  beforeEach(function() {
    mock({
      'configs/': {
        'mainnet.cfg': '',
      },
    });
  });
  afterEach(mock.restore);

  it('Configs/ directory should contain mainnet.cfg file', (done) => {
    fs.readFile('configs/mainnet.cfg', function(err, data) {
      if (err) {
        return done(err);
      }
      assert.isTrue(Buffer.isBuffer(data));
      assert.equal(String(data), '');
      done();
    })
  })
})

describe('Selecting Ethereum node', () => {
  describe(`${index.mainOptions[0].message}`, () => {
    const options= index.mainOptions[0]
    let backup;
    before(() => {
      backup = inquirer.prompt;
      inquirer.prompt = (questions) => Promise.resolve(options.filter(options.choices[0]))
    })

    it('User\'s first choice should be lowercased ethereum node', () => {
      inquirer_stub().then(answers => expect(answers).to.equal(userInputs.node))
    })

    after(() => {
      inquirer.prompt = backup
    })
  })
})

describe('Selecting Ethereum network in fast sync mode', () => {
  describe(`${index.options[0].message}`, () => {
    const options = index.options[0]
    let backup;
    before(() => {
      backup = inquirer.prompt;
      inquirer.prompt = (questions) => Promise.resolve(options.filter(options.choices[0]))
    })

    it('User\'s first choice should be lowercased ethereum mainnet', () => {
      inquirer_stub().then(answers => expect(answers).to.equal(userInputs.network))
    })

    after(() => {
      inquirer.prompt = backup
    })
  })

  describe(`${index.options[1].message}`, () => {
    const options = index.options[1]
    let backup;
    before(() => {
      backup = inquirer.prompt;
      inquirer.prompt = (questions) => Promise.resolve(options.filter(options.choices[0]))
    })

    it('User\'s first choice should return empty value', () => {
      inquirer_stub().then(answers => expect(answers).to.equal(userInputs.mode))
    })

    after(() => {
      inquirer.prompt = backup
    })
  })
})

describe('JsonRpc prompts', () => {
  describe(`${index.jsonRpcEnabled[0].message}`, () => {
    const options = index.jsonRpcEnabled[0]
    let backup;
    before(() => {
      backup = inquirer.prompt;
      inquirer.prompt = (questions) => Promise.resolve(options.default)
    })

    it('Default value should be set to false', () => {
      inquirer_stub().then(answers => expect(answers).to.be.false)
    })

    after(() => {
      inquirer.prompt = backup
    })
  })

  describe(`${index.jsonRpcUrl[0].message}`, () => {
    const options = index.jsonRpcUrl[0]
    let backup;
    before(() => {
      backup = inquirer.prompt;
      inquirer.prompt = (questions) => Promise.resolve(options.default)
    })
  
    it('Default value should be equal to 127.0.0.1', () => {
      inquirer_stub().then(answers => expect(answers).to.equal(userInputs.jsonRpcUrl))
    })
  
    after(() => {
      inquirer.prompt = backup
    })
  })
})

describe('EthStats prompts', () => {
  describe(`${index.ethStatsEnabled[0].message}`, () => {
    const options = index.ethStatsEnabled[0]
    let backup;
    before(() => {
      backup = inquirer.prompt;
      inquirer.prompt = (questions) => Promise.resolve(options.default)
    })
  
    it('Default value should be set to false', () => {
      inquirer_stub().then(answers => expect(answers).to.be.false)
    })
  
    after(() => {
      inquirer.prompt = backup
    })
  })

  describe(`${index.ethStatsOptions[1].message}`, () => {
    const options = index.ethStatsOptions[1]
    let backup;
    before(() => {
      backup = inquirer.prompt;
      inquirer.prompt = (questions) => Promise.resolve(options.default)
    })
  
    it('Default value should be set to Nethermind Node', () => {
      inquirer_stub().then(answers => expect(answers).to.equal(userInputs.nodeName))
    })
  
    after(() => {
      inquirer.prompt = backup
    })
  })

  describe(`${index.ethStatsOptions[2].message}`, () => {
    const options = index.ethStatsOptions[2]
    let backup;
    before(() => {
      backup = inquirer.prompt;
      inquirer.prompt = (questions) => Promise.resolve(options.default)
    })
  
    it('Default value should be set to dev@nethermind.io', () => {
      inquirer_stub().then(answers => expect(answers).to.equal(userInputs.contact))
    })
  
    after(() => {
      inquirer.prompt = backup
    })
  })

  describe(`${index.ethStatsOptions[0].message}`, () => {
    const options = index.ethStatsOptions[0]
    let backup;
    before(() => {
      backup = inquirer.prompt;
      inquirer.prompt = (questions) => Promise.resolve(options.validate(userInputs.secret))
    })
  
    it('If secret is not provided return \'Secret password needs to be provided.\'', () => {
      inquirer_stub().then(answers => expect(answers).to.equal('Secret password needs to be provided.'))
    })
  
    after(() => {
      inquirer.prompt = backup
    })
  })

  describe('What is the ethStats WebSocket address (this is a WebSocket address that you can obtain from Core Devs, depends on chain selected)?', () => {
    const config = userInputs.config
    const options = {
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
    }
    let backup;
    before(() => {
      backup = inquirer.prompt;
      inquirer.prompt = (questions) => Promise.resolve(options.default(config))
    })
  
    it('Default value should return "wss://ethstats.net/api" if mainnet was selected', () => {
      inquirer_stub().then(answers => expect(answers).to.equal(userInputs.wss))
    })
  
    after(() => {
      inquirer.prompt = backup
    })
  })
})
