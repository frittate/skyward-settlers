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
    const length = text.length;
    switch (color) {
        case "red":
            console.log(chalk.bold.red("=".repeat(length)));
            console.log(chalk.bold.red(text));
            console.log(chalk.bold.red("=".repeat(length)));
            break;
        case "blue":
            console.log(chalk.bold.blue("=".repeat(length)));
            console.log(chalk.bold.blue(text));
            console.log(chalk.bold.blue("=".repeat(length)));
            break;
        case "yellow":
            console.log(chalk.bold.yellow("=".repeat(length)));
            console.log(chalk.bold.yellow(text));
            console.log(chalk.bold.yellow("=".repeat(length)));
            break;
        case "cyan":
            console.log(chalk.bold.cyan("=".repeat(length)));
            console.log(chalk.bold.cyan(text));
            console.log(chalk.bold.cyan("=".repeat(length)));
            break;
        case "green":
            console.log(chalk.bold.green("=".repeat(length)));
            console.log(chalk.bold.green(text));
            console.log(chalk.bold.green("=".repeat(length)));
            break;
        default:
            console.log(chalk.bold.white("=".repeat(length)));
            console.log(chalk.bold.white(text));
            console.log(chalk.bold.white("=".repeat(length)));
            break;
    }

}

module.exports = {
    colortext,
    boldtext,
    headline
}