const chalk = require('chalk');

function colortext(text, color) {
    switch (color) {
        case "red":
            console.log(chalk.red(text));
            break;
        case "blue":
            console.log(chalk.blue(text));
            break;
        case "yellow":
            console.log(chalk.yellow(text));
            break;
        case "cyan":
            console.log(chalk.cyan(text));
            break;
        case "green":
            console.log(chalk.green(text));
            break;
        default:
            break;
    }
    
}

function boldtext(text, color) {
    switch (color) {
        case "red":
            console.log(chalk.bold.red(text));
            break;
        case "blue":
            console.log(chalk.bold.blue(text));
            break;
        case "yellow":
            console.log(chalk.bold.yellow(text));
            break;
        case "cyan":
            console.log(chalk.bold.cyan(text));
            break;
        case "green":
            console.log(chalk.bold.green(text));
            break;
        default:
            console.log(chalk.bold.white(text))
            break;
    }
}

function headline(text, color) {
    console.log(chalk.bold.color("=============================="));
    console.log(chalk.bold.color(text));
    console.log(chalk.bold.color("=============================="));
}

module.exports = {
    colortext,
    boldtext
}