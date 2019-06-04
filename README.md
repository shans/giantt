# giantt

## Installation

* clone source code locally
* `npm install`
* `npm install -g typescript`
* `tsc`
* webpack stuff:
  * `npm install typescript ts-loader webpack`
  * `./node_modules/webpack/bin/webpack.js`

## Usage

 * Download some giantt-format Gantt chart data from a spreadsheet somewhere as .csv data
 * copy .csv file to 'input.csv'
 * `./src/main.js --inputFile=input.csv --output=<whatever-file-you-want.html>` to build a global chart
 * `./src/by-owner.js --inputFile=input.csv --owner=<resource-name> --dependencies --output=<filename.html>` to build a chart for an individual resource
 
 ## Disclaimer
 
 Lots of stuff probably doesn't work.
