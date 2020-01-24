const inquirer = require('inquirer')

module.exports = (questions) => {
  return inquirer.prompt(questions).then()
}