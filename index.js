// required packages
var fs = require('fs');
var os = require('os');
var path = require('path');
var prompt = require('prompt');
var clc = require('cli-color');
var async = require('async');
var recursive = require('recursive-readdir');
var exec = require('child_process').exec;

// some basic color coding
var error = clc.red.bold;
var warn = clc.yellow;
var notice = clc.blue;

// make new lines render correctly cross platform
var os = require('os'), EOL = os.EOL;

// structure
var main = {};

// these get defined later
main.files;
main.searchDir;
main.regex;
main.copyDir;

// these track the progress of the droplet communication, since it's fairly synchronous in operation
main.currentGroup = 0;
main.currentFile = 0;

// file path constants
main.outputDir = path.normalize('./output');
main.tempDir = os.tmpdir();
main.platform = os.platform();

// grab the droplet
var dropsList = fs.readdirSync('./droplet');
for (drops in dropsList) {
  if (!drops.match(/^\./)) {
    var dropName = dropsList[drops];
  }
}
main.dropletLoc = path.normalize( './droplet/' + dropName);

// grab values as cli options, prompt asks later if not supplied
if ( process.argv[2] ) main.searchDir = process.argv[2];
if ( process.argv[3] ) main.regex = process.argv[3];

// clear the CLI to clean up visually before beginning
console.log(clc.reset);

// prompt the user, search for files, then start feeding locations to the droplet
async.waterfall([function(callback) {
    prompt.start();

    var promptObj = {};

    if (!main.searchDir) {
      promptObj.searchDir = {
        description: 'What is the full path of the directory you want to search? (default: desktop)'.green
      }
    }

    if (!main.regex) {
      promptObj.regex = {
        description: 'What should the filepath look like? The default is "/psd$/", meaning "anything with \'psd\' on the tail end of it".'.green
      }
    }

    // arguments can be specified via CLI options or asked as questions
    if ( !promptObj.searchDir || !promptObj.searchDir ) {
      // ask for some user input
      prompt.get({
        properties: promptObj
      }, function(err, results) {
        if (err) console.log(err);

        console.log(clc.reset);
        console.log('User input received, searching for files (this will take a while)...');

        // callback trigers the next anonymous function
        callback(null, results);
      });
    } else {
      var results = false;
      callback(null, results);
    }
    
  }, function(arg1, callback) {

    // set default search path
    if (!main.searchDir) main.searchDir = arg1.searchDir || path.normalize('~/Desktop');
    main.searchDir = main.searchDir.replace(/ $/, '').replace(/\\/g, '');
    
    // set a default regex
    if (!main.regex) {
      if (arg1.regex) {
        main.regex = new RegExp(arg1.regex, 'g') 
      } else {
        main.regex = /\.psd$/;
      }
    }

    // search for files in the specified directory
    recursive(main.searchDir, function(err, files) {
      if (err) console.log(err);

      main.files = files;
      console.log('Found ' + clc.green(main.files.length) + ' total files in ' + clc.green(main.searchDir));

      callback();
    });

  }, function(callback) {

    console.log('Eliminating unmatching files using regex: ' + clc.green(main.regex));

    // loop through the results to eliminate unwanted files
    var tempArr = main.files;
    main.files = [];
    for (file in tempArr) {
      if (tempArr[file].match(main.regex)) {
        main.files.push(tempArr[file]);
      }
    }

    console.log('Found ' + clc.green(main.files.length) + ' matching files...');

    callback();

  }, function(callback) {

    // make an output folder on the desktop if it doesn't exist
    fs.exists(main.outputDir, function (exists) {
      if (!exists) {
        fs.mkdir(main.outputDir, function() {
          console.log('Output folder created in directory...');
          callback();
        });
      } else {
        console.log('Output folder exists, skipping creation...');
        callback();
      }
    });
    
  }, function(callback) {

    // setup the file list for groups (2D array)
    var fileList = main.files;
    main.files = [];

    // start sending to the droplet, 250 at a time
    var i = 0;
    var g = 0;
    while (i < fileList.length) {
      // console.log('assigning file: ' + fileList[i] + ' into group: ' + g) ;
      if (i === 0) main.files[g] = [];
      main.files[g][i] = fileList[i];

      // increment the counter
      i++;

      // break into groups of 250
      if (i % 250 === 0) {
        i = 0;
        g++;
      }
    }

    // actually send the images to the droplet with a recursive function
    exportImages();

    // console.log(clc.red('Done!'));
    callback();
  }
]);

function exportImages() {

    // add 'open' if on a mac
    if (main.platform == 'darwin') {

      var platformToken = 'open ';

      main.dropletLoc = main.dropletLoc.replace(/ /g, '\\ ');

    } else {
      var platformToken = '';
    }

    var filesString = '';

    while (main.currentFile < main.files[main.currentGroup].length) {
      
      if (main.platform = 'darwin') {
        filesString += main.files[main.currentGroup][main.currentFile].replace(/\s/g, '\\ ') + ' ';
      } else {
        filesString += main.files[main.currentGroup][main.currentFile].replace(/\s/g, '/ ');
      }

      main.currentFile++;
    }

    main.currentGroup++;
    main.currentFile = 0;

    var execStr = platformToken + main.dropletLoc + ' ' + filesString;

    console.log( clc.blue( '\nExecuting: ' + execStr ) );
    exec(execStr, function(error, stdout, stderr) {
      if (stdout) console.log(clc.red(stdout));
      if (error) console.log(clc.red(error));
      if (stderr) console.log(clc.red(stderr));

      if (error || stderr) {
        setTimeout(exportImages(), 500000);
      } else if (main.files[main.currentGroup]) {
        exportImages();
      } else {
        console.log(clc.green('\nDone!\n'));
      }
    });
}